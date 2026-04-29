from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime
import uuid
from ..models.user import UserCreate, UserUpdate, UserOut
from ..auth import require_admin, hash_password
from ..database import get_db, get_es, ES_INDEX
from ..config import OAB_STRUCTURE

router = APIRouter(tags=["admin"])


# ── Users ────────────────────────────────────────────────────────────────────

def _user_out(doc: dict) -> UserOut:
    return UserOut(
        id=doc["_id"],
        name=doc["name"],
        email=doc["email"],
        role=doc["role"],
        is_active=doc["is_active"],
        created_at=doc["created_at"],
    )


@router.get("/usuarios", response_model=list[UserOut])
async def list_users(admin=Depends(require_admin), db=Depends(get_db)):
    docs = await db.users.find().sort("created_at", -1).to_list(200)
    return [_user_out(d) for d in docs]


@router.post("/usuarios", response_model=UserOut, status_code=201)
async def create_user(body: UserCreate, admin=Depends(require_admin), db=Depends(get_db)):
    if await db.users.find_one({"email": body.email.lower()}):
        raise HTTPException(status_code=409, detail="E-mail já cadastrado")
    doc = {
        "_id": str(uuid.uuid4()),
        "name": body.name,
        "email": body.email.lower(),
        "password_hash": hash_password(body.password),
        "role": body.role,
        "is_active": True,
        "created_at": datetime.utcnow(),
    }
    await db.users.insert_one(doc)
    return _user_out(doc)


@router.put("/usuarios/{user_id}", response_model=UserOut)
async def update_user(user_id: str, body: UserUpdate, admin=Depends(require_admin), db=Depends(get_db)):
    doc = await db.users.find_one({"_id": user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    updates = body.model_dump(exclude_none=True)
    if "password" in updates:
        updates["password_hash"] = hash_password(updates.pop("password"))
    if "email" in updates:
        updates["email"] = updates["email"].lower()
    await db.users.update_one({"_id": user_id}, {"$set": updates})
    doc.update(updates)
    return _user_out(doc)


@router.delete("/usuarios/{user_id}")
async def delete_user(user_id: str, admin=Depends(require_admin), db=Depends(get_db)):
    result = await db.users.delete_one({"_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return {"ok": True}


# ── Questions ─────────────────────────────────────────────────────────────────

@router.get("/questoes")
async def list_questoes(
    disciplina: str = Query(None),
    tem_gabarito: bool = Query(None),
    status: str = Query(None),
    q: str = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    admin=Depends(require_admin),
    es=Depends(get_es),
):
    filters = []
    if disciplina:
        filters.append({"term": {"disciplina": disciplina}})
    if tem_gabarito is not None:
        filters.append({"term": {"tem_gabarito": tem_gabarito}})
    if status:
        filters.append({"term": {"status": status}})
    if q:
        filters.append({"match": {"enunciado": q}})

    body = {
        "query": {"bool": {"must": filters}} if filters else {"match_all": {}},
        "from": (page - 1) * size,
        "size": size,
        "sort": [{"disciplina": "asc"}, {"_score": "desc"}],
    }
    result = await es.search(index=ES_INDEX, body=body)
    hits = result["hits"]
    return {
        "total": hits["total"]["value"],
        "page": page,
        "size": size,
        "items": [h["_source"] for h in hits["hits"]],
    }


@router.get("/questoes/{questao_id}")
async def get_questao(questao_id: str, admin=Depends(require_admin), es=Depends(get_es)):
    try:
        doc = await es.get(index=ES_INDEX, id=questao_id)
        return doc["_source"]
    except Exception:
        raise HTTPException(status_code=404, detail="Questão não encontrada")


@router.put("/questoes/{questao_id}")
async def update_questao(questao_id: str, body: dict, admin=Depends(require_admin), es=Depends(get_es)):
    allowed = {"gabarito", "gabarito_comentado", "disciplina", "assunto", "status",
               "grau_dificuldade", "video_url", "enunciado", "alternativas"}
    updates = {k: v for k, v in body.items() if k in allowed}
    if "gabarito" in updates:
        updates["tem_gabarito"] = bool(updates["gabarito"])
    try:
        await es.update(index=ES_INDEX, id=questao_id, body={"doc": updates})
    except Exception:
        raise HTTPException(status_code=404, detail="Questão não encontrada")
    return {"ok": True}


# ── Disciplines ───────────────────────────────────────────────────────────────

@router.get("/disciplinas")
async def list_disciplinas(admin=Depends(require_admin), es=Depends(get_es)):
    result = await es.search(
        index=ES_INDEX,
        body={
            "size": 0,
            "aggs": {
                "by_disc": {
                    "terms": {"field": "disciplina", "size": 50},
                    "aggs": {
                        "com_gabarito": {"filter": {"term": {"tem_gabarito": True}}},
                        "validas": {"filter": {"term": {"status": "VÁLIDA"}}},
                        "avg_acerto": {"avg": {"field": "taxa_acerto"}},
                    },
                }
            },
        },
    )
    buckets = result["aggregations"]["by_disc"]["buckets"]
    rows = []
    for b in buckets:
        disc = b["key"]
        total = b["doc_count"]
        com_g = b["com_gabarito"]["doc_count"]
        validas = b["validas"]["doc_count"]
        avg = b["avg_acerto"].get("value")
        rows.append({
            "disciplina": disc,
            "total": total,
            "com_gabarito": com_g,
            "sem_gabarito": total - com_g,
            "validas": validas,
            "taxa_acerto_media": round(avg * 100, 1) if avg else None,
            "required_per_exam": OAB_STRUCTURE.get(disc, 0),
        })
    rows.sort(key=lambda x: x["disciplina"])
    return rows


# ── Global stats ──────────────────────────────────────────────────────────────

@router.get("/stats")
async def admin_stats(admin=Depends(require_admin), db=Depends(get_db), es=Depends(get_es)):
    total_users = await db.users.count_documents({})
    total_sessoes = await db.sessoes.count_documents({})
    total_finalizadas = await db.sessoes.count_documents({"status": "finalizado"})
    count_result = await es.count(index=ES_INDEX)
    total_questoes = count_result["count"]
    with_g = await es.count(index=ES_INDEX, body={"query": {"term": {"tem_gabarito": True}}})
    return {
        "total_users": total_users,
        "total_sessoes": total_sessoes,
        "total_finalizadas": total_finalizadas,
        "total_questoes": total_questoes,
        "questoes_com_gabarito": with_g["count"],
        "questoes_sem_gabarito": total_questoes - with_g["count"],
    }
