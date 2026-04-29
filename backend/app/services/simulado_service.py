import random
import numpy as np
from datetime import datetime
from typing import Optional
from ..config import OAB_STRUCTURE
from ..database import get_db, get_es, ES_INDEX


async def _fetch_all_for_discipline(disciplina: str) -> list[dict]:
    es = get_es()
    result = await es.search(
        index=ES_INDEX,
        body={
            "query": {
                "bool": {
                    "must": [
                        {"term": {"disciplina": disciplina}},
                        {"term": {"tem_gabarito": True}},
                        {"term": {"status": "VÁLIDA"}},
                    ]
                }
            },
            "size": 2000,
            "_source": {
                "excludes": ["gabarito_comentado"]
            },
        },
    )
    return [hit["_source"] for hit in result["hits"]["hits"]]


def _weighted_sample(questions: list[dict], user_counts: dict, k: int) -> list[dict]:
    if not questions:
        return []
    weights = np.array([1.0 / (user_counts.get(q["id"], 0) + 1) for q in questions], dtype=float)
    weights /= weights.sum()
    # Allow replacement when fewer questions available than needed (disciplines with small pools)
    replace = len(questions) < k
    indices = np.random.choice(len(questions), size=k, replace=replace, p=weights)
    return [questions[i] for i in indices]


async def gerar_questoes_simulado(user_id: str) -> list[dict]:
    db = get_db()

    # Build per-user question appearance counts from finished sessions
    sessoes = await db.sessoes.find(
        {"user_id": user_id, "status": "finalizado"},
        {"questoes.questao_id": 1}
    ).to_list(None)

    user_counts: dict[str, int] = {}
    for sessao in sessoes:
        for q in sessao.get("questoes", []):
            qid = q["questao_id"]
            user_counts[qid] = user_counts.get(qid, 0) + 1

    selected: list[dict] = []
    numero = 1

    for disciplina, quantidade in OAB_STRUCTURE.items():
        questions = await _fetch_all_for_discipline(disciplina)
        sampled = _weighted_sample(questions, user_counts, quantidade)
        for q in sampled:
            selected.append({
                "questao_id": q["id"],
                "numero": numero,
                "disciplina": q["disciplina"],
                "enunciado": q["enunciado"],
                "alternativas": q["alternativas"],
                "gabarito": q["gabarito"],
                "resposta_usuario": None,
                "correta": None,
            })
            numero += 1

    return selected


def corrigir_sessao(questoes: list[dict]) -> tuple[int, int, dict]:
    score = 0
    total = 0
    por_disciplina: dict[str, dict] = {}

    for q in questoes:
        gabarito = q.get("gabarito")
        if not gabarito:
            continue
        total += 1
        disc = q.get("disciplina", "Não classificada")
        if disc not in por_disciplina:
            por_disciplina[disc] = {"acertos": 0, "total": 0, "erros": 0}
        por_disciplina[disc]["total"] += 1

        resposta = q.get("resposta_usuario")
        if resposta and resposta.upper() == gabarito.upper():
            score += 1
            q["correta"] = True
            por_disciplina[disc]["acertos"] += 1
        else:
            q["correta"] = False
            por_disciplina[disc]["erros"] += 1

    return score, total, por_disciplina


async def atualizar_estatisticas_es(questoes: list[dict]):
    """Update per-question stats in Elasticsearch after a simulado is finished."""
    es = get_es()
    for q in questoes:
        qid = q.get("questao_id")
        gabarito = q.get("gabarito")
        resposta = q.get("resposta_usuario")
        if not qid or not gabarito:
            continue

        acertou = resposta and resposta.upper() == gabarito.upper()
        alt = resposta.upper() if resposta else "sem_resposta"

        script = """
            ctx._source.vezes_apareceu = (ctx._source.vezes_apareceu ?: 0) + 1;
            if (params.acertou) {
                ctx._source.respostas_corretas = (ctx._source.respostas_corretas ?: 0) + 1;
            }
            ctx._source.total_respostas = (ctx._source.total_respostas ?: 0) + 1;
            ctx._source.taxa_acerto = ctx._source.respostas_corretas / (double)ctx._source.total_respostas;
            if (ctx._source.respostas_por_alternativa == null) {
                ctx._source.respostas_por_alternativa = [:];
            }
            def k = params.alt;
            ctx._source.respostas_por_alternativa[k] = (ctx._source.respostas_por_alternativa[k] ?: 0) + 1;
        """
        try:
            await es.update(
                index=ES_INDEX,
                id=qid,
                body={
                    "script": {
                        "source": script,
                        "params": {"acertou": acertou, "alt": alt},
                    }
                },
            )
        except Exception:
            pass
