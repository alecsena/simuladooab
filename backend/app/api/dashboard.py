from fastapi import APIRouter, Depends
from ..auth import get_current_user
from ..database import get_db, get_es, ES_INDEX
from ..config import OAB_STRUCTURE

router = APIRouter(tags=["dashboard"])


@router.get("/stats")
async def stats(user=Depends(get_current_user), db=Depends(get_db)):
    sessoes = await db.sessoes.find(
        {"user_id": user["_id"], "status": "finalizado"},
        {"score": 1, "total": 1, "started_at": 1, "finished_at": 1, "tempo_gasto": 1, "por_disciplina": 1},
    ).sort("started_at", 1).to_list(None)

    if not sessoes:
        return {
            "total_simulados": 0,
            "nota_media": None,
            "nota_maxima": None,
            "nota_minima": None,
            "por_disciplina": [],
            "evolucao": [],
        }

    scores = [s["score"] for s in sessoes if s.get("score") is not None]
    totals = [s["total"] for s in sessoes if s.get("total") is not None]

    nota_media = round(sum(scores) / len(scores), 1) if scores else None
    nota_maxima = max(scores) if scores else None
    nota_minima = min(scores) if scores else None
    total_sessoes = max(len(scores), 1)

    # Aggregate discipline stats across all sessions
    disc_agg: dict[str, dict] = {}
    for sessao in sessoes:
        for disc, data in (sessao.get("por_disciplina") or {}).items():
            if disc not in disc_agg:
                disc_agg[disc] = {"acertos": 0, "total": 0, "required": OAB_STRUCTURE.get(disc, 0)}
            disc_agg[disc]["acertos"] += data.get("acertos", 0)
            disc_agg[disc]["total"] += data.get("total", 0)

    por_disciplina = []
    for disc, data in disc_agg.items():
        pct = round(data["acertos"] / data["total"] * 100, 1) if data["total"] > 0 else 0
        por_disciplina.append({
            "disciplina": disc,
            "acertos": data["acertos"],
            "total": data["total"],
            "taxa_acerto": pct,
            "required_per_exam": data["required"],
        })
    por_disciplina.sort(key=lambda x: x["taxa_acerto"])

    evolucao = [
        {
            "sessao": i + 1,
            "score": s.get("score"),
            "total": s.get("total"),
            "pct": round(s["score"] / s["total"] * 100, 1) if s.get("score") and s.get("total") else 0,
            "data": s["started_at"].isoformat(),
        }
        for i, s in enumerate(sessoes)
        if s.get("score") is not None
    ]

    return {
        "total_simulados": len(sessoes),
        "nota_media": nota_media,
        "nota_maxima": nota_maxima,
        "nota_minima": nota_minima,
        "total_medio": round(sum(totals) / len(totals), 1) if totals else None,
        "por_disciplina": por_disciplina,
        "evolucao": evolucao,
    }
