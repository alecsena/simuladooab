import asyncio
import logging
import uuid
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .auth import hash_password
from .config import settings
from .database import ES_INDEX, ES_MAPPING, connect, disconnect, get_db, get_es
from .api import auth, simulado, dashboard, admin, questoes

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("oab")


async def _create_indexes():
    db = get_db()
    await db.sessoes.create_index([("user_id", 1), ("status", 1)])
    await db.sessoes.create_index([("user_id", 1), ("started_at", -1)])
    await db.users.create_index("email", unique=True)
    await db.comentarios.create_index("questao_id")


async def _seed_admin():
    db = get_db()
    exists = await db.users.find_one({"email": settings.admin_email})
    if not exists:
        await db.users.insert_one({
            "_id": str(uuid.uuid4()),
            "name": settings.admin_name,
            "email": settings.admin_email,
            "password_hash": hash_password(settings.admin_password),
            "role": "admin",
            "is_active": True,
            "created_at": datetime.utcnow(),
        })
        log.info("Admin user created: %s", settings.admin_email)


async def _setup_es():
    es = get_es()
    exists = await es.indices.exists(index=ES_INDEX)
    if not exists:
        await es.indices.create(index=ES_INDEX, body=ES_MAPPING)
        log.info("Elasticsearch index '%s' created", ES_INDEX)

    # Run import if index is empty
    count = await es.count(index=ES_INDEX)
    if count["count"] == 0:
        log.info("Index is empty — running question importer...")
        import subprocess, sys
        proc = await asyncio.create_subprocess_exec(
            sys.executable,
            "/app/scripts/import_questions.py",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )
        stdout, _ = await proc.communicate()
        log.info("Importer output:\n%s", stdout.decode())


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect()
    await _setup_es()
    await _create_indexes()
    await _seed_admin()
    yield
    await disconnect()


app = FastAPI(title="OAB Simulado API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth")
app.include_router(simulado.router, prefix="/api/simulado")
app.include_router(dashboard.router, prefix="/api/dashboard")
app.include_router(admin.router, prefix="/api/admin")
app.include_router(questoes.router, prefix="/api/questoes")


@app.get("/api/health")
async def health():
    return {"status": "ok"}
