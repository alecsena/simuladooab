from fastapi import APIRouter, HTTPException, Depends, status
from datetime import datetime
import uuid
from ..models.sessao import SessaoCreate, SessaoOut, SessaoResumo, RespostaInput, QuestaoSessao
from ..auth import get_current_user
from ..database import get_db
from ..services.simulado_service import gerar_questoes_simulado, corrigir_sessao, atualizar_estatisticas_es

router = APIRouter(tags=["simulado"])


def _sessao_out(doc: dict) -> SessaoOut:
    questoes = [QuestaoSessao(**q) for q in doc.get("questoes", [])]
    return SessaoOut(
        id=doc["_id"],
        user_id=doc["user_id"],
        status=doc["status"],
        started_at=doc["started_at"],
        finished_at=doc.get("finished_at"),
        duracao_limite=doc["duracao_limite"],
        tempo_gasto=doc.get("tempo_gasto"),
        questoes=questoes,
        score=doc.get("score"),
        total=doc.get("total"),
        por_disciplina=doc.get("por_disciplina"),
    )


@router.post("/novo", response_model=SessaoOut)
async def novo_simulado(body: SessaoCreate, user=Depends(get_current_user), db=Depends(get_db)):
    # Check for unfinished session
    existing = await db.sessoes.find_one({"user_id": user["_id"], "status": "em_andamento"})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Você já tem um simulado em andamento: {existing['_id']}",
        )

    questoes = await gerar_questoes_simulado(user["_id"])
    if not questoes:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Sem questões disponíveis")

    doc = {
        "_id": str(uuid.uuid4()),
        "user_id": user["_id"],
        "status": "em_andamento",
        "started_at": datetime.utcnow(),
        "finished_at": None,
        "duracao_limite": body.duracao_limite,
        "tempo_gasto": None,
        "questoes": [q for q in questoes],
        "score": None,
        "total": None,
        "por_disciplina": None,
    }
    await db.sessoes.insert_one(doc)
    sanitized = {**doc, "questoes": [{**q, "gabarito": None, "correta": None} for q in doc["questoes"]]}
    return _sessao_out(sanitized)


@router.get("/{sessao_id}", response_model=SessaoOut)
async def get_simulado(sessao_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    doc = await db.sessoes.find_one({"_id": sessao_id, "user_id": user["_id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Simulado não encontrado")
    if doc["status"] == "em_andamento":
        doc = {**doc, "questoes": [{**q, "gabarito": None, "correta": None} for q in doc.get("questoes", [])]}
    return _sessao_out(doc)


@router.put("/{sessao_id}/responder")
async def responder(sessao_id: str, body: RespostaInput, user=Depends(get_current_user), db=Depends(get_db)):
    doc = await db.sessoes.find_one({"_id": sessao_id, "user_id": user["_id"], "status": "em_andamento"})
    if not doc:
        raise HTTPException(status_code=404, detail="Simulado não encontrado ou já finalizado")

    updated = False
    for q in doc.get("questoes", []):
        if q["questao_id"] == body.questao_id:
            q["resposta_usuario"] = body.resposta.upper()
            updated = True
            break

    if not updated:
        raise HTTPException(status_code=404, detail="Questão não encontrada neste simulado")

    await db.sessoes.update_one(
        {"_id": sessao_id},
        {"$set": {"questoes": doc["questoes"]}},
    )
    return {"ok": True}


@router.post("/{sessao_id}/finalizar", response_model=SessaoOut)
async def finalizar(sessao_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    doc = await db.sessoes.find_one({"_id": sessao_id, "user_id": user["_id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Simulado não encontrado")
    if doc["status"] == "finalizado":
        return _sessao_out(doc)

    now = datetime.utcnow()
    tempo_gasto = int((now - doc["started_at"]).total_seconds())

    score, total, por_disciplina = corrigir_sessao(doc["questoes"])

    updates = {
        "status": "finalizado",
        "finished_at": now,
        "tempo_gasto": tempo_gasto,
        "questoes": doc["questoes"],
        "score": score,
        "total": total,
        "por_disciplina": por_disciplina,
    }
    await db.sessoes.update_one({"_id": sessao_id}, {"$set": updates})
    doc.update(updates)

    # Update ES stats asynchronously (fire and forget)
    import asyncio
    asyncio.create_task(atualizar_estatisticas_es(doc["questoes"]))

    return _sessao_out(doc)


@router.get("/", response_model=list[SessaoResumo])
async def listar_sessoes(user=Depends(get_current_user), db=Depends(get_db)):
    docs = await db.sessoes.find(
        {"user_id": user["_id"]},
        {"questoes": 0},
    ).sort("started_at", -1).to_list(50)
    return [
        SessaoResumo(
            id=d["_id"],
            started_at=d["started_at"],
            finished_at=d.get("finished_at"),
            status=d["status"],
            score=d.get("score"),
            total=d.get("total"),
            duracao_limite=d["duracao_limite"],
            tempo_gasto=d.get("tempo_gasto"),
        )
        for d in docs
    ]
