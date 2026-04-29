from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class RespostaInput(BaseModel):
    questao_id: str
    resposta: str  # A, B, C, D


class SessaoCreate(BaseModel):
    duracao_limite: int = 7200  # seconds


class QuestaoSessao(BaseModel):
    questao_id: str
    numero: int
    disciplina: str
    enunciado: str
    alternativas: dict
    gabarito: Optional[str] = None
    resposta_usuario: Optional[str] = None
    correta: Optional[bool] = None


class SessaoOut(BaseModel):
    id: str
    user_id: str
    status: str  # em_andamento | finalizado
    started_at: datetime
    finished_at: Optional[datetime] = None
    duracao_limite: int
    tempo_gasto: Optional[int] = None
    questoes: list[QuestaoSessao]
    score: Optional[int] = None
    total: Optional[int] = None
    por_disciplina: Optional[dict] = None


class SessaoResumo(BaseModel):
    id: str
    started_at: datetime
    finished_at: Optional[datetime] = None
    status: str
    score: Optional[int] = None
    total: Optional[int] = None
    duracao_limite: int
    tempo_gasto: Optional[int] = None
