from fastapi import APIRouter, HTTPException, Depends
from ..auth import get_current_user
from ..database import get_es, ES_INDEX

router = APIRouter(tags=["questoes"])


@router.get("/{questao_id}/detalhes")
async def detalhes(questao_id: str, user=Depends(get_current_user), es=Depends(get_es)):
    """Returns full question details including commented answer and stats."""
    try:
        doc = await es.get(index=ES_INDEX, id=questao_id)
        src = doc["_source"]
        return {
            "id": src.get("id"),
            "gabarito_comentado": src.get("gabarito_comentado"),
            "video_url": src.get("video_url"),
            "grau_dificuldade": src.get("grau_dificuldade"),
            "taxa_acerto": src.get("taxa_acerto"),
            "total_respostas": src.get("total_respostas", 0),
            "respostas_por_alternativa": src.get("respostas_por_alternativa", {}),
            "vezes_apareceu": src.get("vezes_apareceu", 0),
        }
    except Exception:
        raise HTTPException(status_code=404, detail="Questão não encontrada")


@router.post("/{questao_id}/comentarios")
async def add_comentario(questao_id: str, body: dict, user=Depends(get_current_user), db=None):
    from ..database import get_db
    import uuid
    from datetime import datetime
    db = get_db()
    comentario = {
        "_id": str(uuid.uuid4()),
        "questao_id": questao_id,
        "user_id": user["_id"],
        "user_name": user["name"],
        "texto": body.get("texto", "").strip(),
        "created_at": datetime.utcnow(),
    }
    if not comentario["texto"]:
        raise HTTPException(status_code=400, detail="Comentário não pode ser vazio")
    await db.comentarios.insert_one(comentario)
    return {"ok": True, "id": comentario["_id"]}


@router.get("/{questao_id}/comentarios")
async def list_comentarios(questao_id: str, user=Depends(get_current_user)):
    from ..database import get_db
    db = get_db()
    docs = await db.comentarios.find(
        {"questao_id": questao_id},
        {"_id": 1, "user_name": 1, "texto": 1, "created_at": 1},
    ).sort("created_at", -1).to_list(50)
    return [
        {
            "id": d["_id"],
            "user_name": d["user_name"],
            "texto": d["texto"],
            "created_at": d["created_at"].isoformat(),
        }
        for d in docs
    ]


@router.get("/{questao_id}/historico")
async def historico(questao_id: str, user=Depends(get_current_user)):
    from ..database import get_db
    db = get_db()
    sessoes = await db.sessoes.find(
        {"user_id": user["_id"], "status": "finalizado", "questoes.questao_id": questao_id},
        {"started_at": 1, "questoes.$": 1},
    ).sort("started_at", -1).to_list(20)

    historico = []
    for s in sessoes:
        for q in s.get("questoes", []):
            if q["questao_id"] == questao_id:
                historico.append({
                    "data": s["started_at"].isoformat(),
                    "resposta_usuario": q.get("resposta_usuario"),
                    "correta": q.get("correta"),
                })
    return historico
