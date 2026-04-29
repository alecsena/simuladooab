#!/usr/bin/env python3
"""
Import and merge OAB questions into Elasticsearch.

Sources:
  Pool A (authoritative): resultado_exame_39–45.json  → have gabarito + correct discipline
  Pool B (archive v2):    questoes_v2.json            → flat A/B/C/D fields, gabarito + comentario

Merge strategy:
  1. Index all Pool A questions (authoritative).
  2. For each Pool B question, attempt exact-prefix match against Pool A enunciados.
     Matched: skip (Pool A already indexed it).
     Unmatched: index with full gabarito + gabarito_comentado, normalised discipline.

v2 file layout (per item):
  {
    "id": "TRSU0033", "ano": "OAB / 2025", "disciplina": "TRIBUTÁRIO",
    "assunto": "...", "enunciado": "...",
    "A": "...", "B": "...", "C": "...", "D": "...",
    "gabarito": "A", "comentario": "..."
  }
"""

import json
import os
import re
import sys
import asyncio
import uuid
import logging
from pathlib import Path

sys.path.insert(0, "/app")

from elasticsearch import AsyncElasticsearch
from app.config import settings, DISC_MAPPING, OAB_STRUCTURE
from app.database import ES_INDEX, ES_MAPPING

log = logging.getLogger("importer")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

DATA_DIR = Path(settings.data_dir)
PROVAS_DIR = DATA_DIR / "provas"
QUESTOES_JSON = DATA_DIR / "questoes_v2.json"

ENUNCIADO_KNOWN_DISCIPLINES = [
    ("PROCESSO CIVIL",                   "Direito Processual Civil"),
    ("PROCESSO PENAL",                   "Direito Processual Penal"),
    ("PROCESSO DO TRABALHO",             "Direito Processual do Trabalho"),
    ("ESTATUTO DA CRIANÇA E DO ADOLESCENTE", "Direito da Criança e do Adolescente (ECA)"),
    ("DIREITOS HUMANOS",                 "Direitos Humanos"),
    ("DIREITO INTERNACIONAL",            "Direito Internacional"),
    ("DIREITO AMBIENTAL",                "Direito Ambiental"),
    ("DIREITO FINANCEIRO",               "Direito Financeiro e Orçamentário"),
    ("FILOSOFIA DO DIREITO",             "Filosofia do Direito"),
    ("DIREITO ELEITORAL",                "Direito Eleitoral"),
    ("DIREITO PREVIDENCIÁRIO",           "Direito Previdenciário"),
    ("DIREITO DO CONSUMIDOR",            "Direito do Consumidor"),
    ("DIREITO EMPRESARIAL",              "Direito Empresarial"),
    ("DIREITO TRIBUTÁRIO",               "Direito Tributário"),
    ("DIREITO ADMINISTRATIVO",           "Direito Administrativo"),
    ("DIREITO DO TRABALHO",              "Direito do Trabalho"),
    ("DIREITO CIVIL",                    "Direito Civil"),
    ("DIREITO PENAL",                    "Direito Penal"),
    ("DIREITO CONSTITUCIONAL",           "Direito Constitucional"),
    ("ÉTICA",                            "Ética Profissional"),
    ("TRIBUTÁRIO",                       "Direito Tributário"),
    ("ADMINISTRATIVO",                   "Direito Administrativo"),
    ("CONSTITUCIONAL",                   "Direito Constitucional"),
    ("EMPRESARIAL",                      "Direito Empresarial"),
    ("PREVIDENCIÁRIO",                   "Direito Previdenciário"),
    ("AMBIENTAL",                        "Direito Ambiental"),
    ("ELEITORAL",                        "Direito Eleitoral"),
    ("CONSUMIDOR",                       "Direito do Consumidor"),
    ("INTERNACIONAL",                    "Direito Internacional"),
    ("FINANCEIRO",                       "Direito Financeiro e Orçamentário"),
    ("FILOSOFIA",                        "Filosofia do Direito"),
    ("PENAL",                            "Direito Penal"),
    ("CIVIL",                            "Direito Civil"),
    ("TRABALHO",                         "Direito do Trabalho"),
    ("HUMANOS",                          "Direitos Humanos"),
]


def normalize_disc(raw: str, enunciado: str = "") -> str:
    """Map raw discipline name to canonical form, falling back to enunciado scan."""
    if raw:
        canonical = DISC_MAPPING.get(raw.strip())
        if canonical:
            return canonical
        # Try uppercase lookup
        canonical = DISC_MAPPING.get(raw.strip().upper())
        if canonical:
            return canonical

    # Try to extract from enunciado first 80 chars
    prefix = enunciado[:80].upper()
    for keyword, canonical in ENUNCIADO_KNOWN_DISCIPLINES:
        if keyword in prefix:
            return canonical

    return "Não classificada"


def prefix_key(text: str) -> str:
    """First 90 characters, lowercased, whitespace collapsed."""
    return re.sub(r"\s+", " ", text[:90].lower().strip())


def build_doc_from_resultado(q: dict, exame: int) -> dict:
    disc = normalize_disc(q.get("disciplina", ""), q.get("enunciado", ""))
    gabarito = q.get("gabarito", "")
    status = q.get("status", "VÁLIDA")
    return {
        "id": f"EX{exame:02d}_Q{q['numero']:02d}",
        "exame": exame,
        "numero": q["numero"],
        "disciplina": disc,
        "assunto": "",
        "enunciado": q["enunciado"],
        "alternativas": q["alternativas"],
        "gabarito": gabarito if gabarito and status == "VÁLIDA" else None,
        "status": status,
        "grau_dificuldade": q.get("grau_dificuldade", "Não avaliado"),
        "ano": f"OAB / Exame {exame}",
        "gabarito_comentado": None,
        "video_url": None,
        "tem_gabarito": bool(gabarito) and status == "VÁLIDA",
        "fonte": "resultado",
        "vezes_apareceu": 0,
        "total_respostas": 0,
        "respostas_corretas": 0,
        "taxa_acerto": 0.0,
        "respostas_por_alternativa": {"A": 0, "B": 0, "C": 0, "D": 0},
    }


def _is_broken_enunciado(text: str) -> bool:
    """Skip OCR placeholders like '$1bc' / '$1bd' or absurdly short enunciados."""
    stripped = (text or "").strip()
    if len(stripped) < 20:
        return True
    if stripped.startswith("$1"):
        return True
    return False


def build_doc_from_v2(q: dict, pool_a_keys: set) -> dict | None:
    enunciado = q.get("enunciado", "")
    if _is_broken_enunciado(enunciado):
        return None

    key = prefix_key(enunciado)
    if key in pool_a_keys:
        return None  # Already covered by Pool A

    disc_raw = q.get("disciplina", "")
    disc = normalize_disc(disc_raw, enunciado)

    alternativas = {letra: q.get(letra, "") for letra in ("A", "B", "C", "D")}
    gabarito = (q.get("gabarito") or "").strip().upper() or None
    comentario = q.get("comentario") or None

    return {
        "id": q["id"],
        "exame": None,
        "numero": None,
        "disciplina": disc,
        "assunto": q.get("assunto", ""),
        "enunciado": enunciado,
        "alternativas": alternativas,
        "gabarito": gabarito,
        "status": "VÁLIDA",
        "grau_dificuldade": "Não avaliado",
        "ano": q.get("ano", ""),
        "gabarito_comentado": comentario,
        "video_url": None,
        "tem_gabarito": bool(gabarito),
        "fonte": "v2",
        "vezes_apareceu": 0,
        "total_respostas": 0,
        "respostas_corretas": 0,
        "taxa_acerto": 0.0,
        "respostas_por_alternativa": {"A": 0, "B": 0, "C": 0, "D": 0},
    }


async def bulk_index(es: AsyncElasticsearch, docs: list[dict]):
    if not docs:
        return
    body = []
    for doc in docs:
        body.append({"index": {"_index": ES_INDEX, "_id": doc["id"]}})
        body.append(doc)
    resp = await es.bulk(body=body)
    errors = [i for i in resp["items"] if "error" in i.get("index", {})]
    if errors:
        log.warning("%d bulk errors", len(errors))


async def main():
    es = AsyncElasticsearch([f"http://{settings.es_host}"])

    try:
        # Ensure index exists
        if not await es.indices.exists(index=ES_INDEX):
            await es.indices.create(index=ES_INDEX, body=ES_MAPPING)
            log.info("Created index %s", ES_INDEX)

        # ── Pool A: resultado files ──────────────────────────────────────────
        pool_a_docs: list[dict] = []
        pool_a_keys: set[str] = set()

        for folder in sorted(PROVAS_DIR.iterdir()):
            for f in folder.iterdir():
                if not (f.name.startswith("resultado_") and f.suffix == ".json"):
                    continue
                with open(f) as fh:
                    data = json.load(fh)
                exame = data["exame"]
                for q in data["questoes"]:
                    doc = build_doc_from_resultado(q, exame)
                    pool_a_docs.append(doc)
                    pool_a_keys.add(prefix_key(q["enunciado"]))
                log.info("Loaded exame %d: %d questões", exame, len(data["questoes"]))

        await bulk_index(es, pool_a_docs)
        log.info("Pool A indexed: %d questões", len(pool_a_docs))

        # ── Pool B: questoes_v2.json ─────────────────────────────────────────
        if not QUESTOES_JSON.exists():
            log.warning("questoes_v2.json not found at %s", QUESTOES_JSON)
        else:
            with open(QUESTOES_JSON) as fh:
                v2_data = json.load(fh)

            pool_b_docs: list[dict] = []
            seen_ids: set[str] = set()
            skipped_dup = 0
            skipped_pool_a = 0
            skipped_broken = 0

            for q in v2_data:
                qid = q.get("id")
                if not qid:
                    continue
                if qid in seen_ids:
                    skipped_dup += 1
                    continue

                if _is_broken_enunciado(q.get("enunciado", "")):
                    skipped_broken += 1
                    seen_ids.add(qid)
                    continue

                if prefix_key(q.get("enunciado", "")) in pool_a_keys:
                    skipped_pool_a += 1
                    seen_ids.add(qid)
                    continue

                doc = build_doc_from_v2(q, pool_a_keys)
                if doc is None:
                    continue
                seen_ids.add(qid)
                pool_b_docs.append(doc)

            # Index in batches of 500
            for i in range(0, len(pool_b_docs), 500):
                await bulk_index(es, pool_b_docs[i:i+500])

            log.info(
                "Pool B indexed: %d questões "
                "(skipped: %d dup-id, %d pool-A match, %d broken enunciado)",
                len(pool_b_docs), skipped_dup, skipped_pool_a, skipped_broken,
            )

        # ── Summary ─────────────────────────────────────────────────────────
        await es.indices.refresh(index=ES_INDEX)
        count = await es.count(index=ES_INDEX)
        with_g = await es.count(index=ES_INDEX, body={"query": {"term": {"tem_gabarito": True}}})
        log.info("Total indexed: %d questões | Com gabarito: %d | Sem gabarito: %d",
                 count["count"], with_g["count"], count["count"] - with_g["count"])

        # Discipline breakdown
        res = await es.search(
            index=ES_INDEX,
            body={
                "size": 0,
                "aggs": {
                    "disc": {
                        "terms": {"field": "disciplina", "size": 50},
                        "aggs": {"com_g": {"filter": {"term": {"tem_gabarito": True}}}},
                    }
                },
            },
        )
        log.info("\n%-46s %8s %10s", "Disciplina", "Total", "c/ Gabarito")
        log.info("-" * 68)
        for b in sorted(res["aggregations"]["disc"]["buckets"], key=lambda x: -x["doc_count"]):
            req = OAB_STRUCTURE.get(b["key"], 0)
            flag = f"  [req:{req}]" if req else ""
            log.info("%-46s %8d %10d%s", b["key"], b["doc_count"], b["com_g"]["doc_count"], flag)

    finally:
        await es.close()


if __name__ == "__main__":
    asyncio.run(main())
