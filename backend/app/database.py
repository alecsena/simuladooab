from motor.motor_asyncio import AsyncIOMotorClient
from elasticsearch import AsyncElasticsearch
from .config import settings

mongo_client: AsyncIOMotorClient = None
db = None
es: AsyncElasticsearch = None

ES_INDEX = "questoes"

ES_MAPPING = {
    "mappings": {
        "properties": {
            "id": {"type": "keyword"},
            "exame": {"type": "integer"},
            "numero": {"type": "integer"},
            "disciplina": {"type": "keyword"},
            "assunto": {"type": "keyword"},
            "enunciado": {"type": "text", "analyzer": "portuguese"},
            "alternativas": {"type": "object", "enabled": False},
            "gabarito": {"type": "keyword"},
            "status": {"type": "keyword"},
            "grau_dificuldade": {"type": "keyword"},
            "ano": {"type": "keyword"},
            "gabarito_comentado": {"type": "text"},
            "video_url": {"type": "keyword"},
            "tem_gabarito": {"type": "boolean"},
            "fonte": {"type": "keyword"},
            "vezes_apareceu": {"type": "integer"},
            "total_respostas": {"type": "integer"},
            "respostas_corretas": {"type": "integer"},
            "taxa_acerto": {"type": "float"},
            "respostas_por_alternativa": {"type": "object", "enabled": False},
        }
    },
    "settings": {
        "number_of_shards": 1,
        "number_of_replicas": 0,
    },
}


def get_db():
    return db


def get_es():
    return es


async def connect():
    global mongo_client, db, es
    mongo_client = AsyncIOMotorClient(settings.mongo_uri)
    db = mongo_client.oab_simulado
    es = AsyncElasticsearch([f"http://{settings.es_host}"])


async def disconnect():
    if mongo_client:
        mongo_client.close()
    if es:
        await es.close()
