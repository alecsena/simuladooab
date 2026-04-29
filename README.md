# OAB Simulado

Plataforma de simulados para a 1ª fase do Exame de Ordem (OAB), com banco de questões, correção automática, estatísticas e modo revisão.

## Stack

- **Backend:** FastAPI (Python 3.12) + MongoDB + Elasticsearch
- **Frontend:** Next.js 14 (App Router) + TypeScript + TailwindCSS
- **Infra:** Docker Compose

## Estrutura

```
.
├── backend/        # API FastAPI (autenticação, simulados, importação de questões)
│   ├── app/
│   ├── scripts/    # import_questions.py
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/       # Aplicação Next.js (páginas: login, dashboard, simulado, revisão, admin)
│   ├── app/
│   ├── components/
│   └── Dockerfile
├── data/
│   └── questoes_v2.json   # base de questões (montada read-only no backend)
└── docker-compose.yml
```

## Como executar

Pré-requisitos: **Docker** e **Docker Compose**.

```bash
# 1. Clone o repositório
git clone https://github.com/alecsena/simuladooab.git
cd simuladooab

# 2. (opcional) crie seu .env a partir do exemplo e ajuste segredos
cp .env.example .env

# 3. Suba todos os serviços
docker compose up -d --build
```

Serviços expostos:

| Serviço        | URL                       |
|----------------|---------------------------|
| Frontend       | http://localhost:3000     |
| Backend (API)  | http://localhost:8000     |
| Elasticsearch  | http://localhost:9200     |
| MongoDB        | mongodb://localhost:27017 |

### Importar questões

Após o primeiro `up`, importe a base de questões (lê `data/questoes_v2.json`):

```bash
docker compose exec backend python scripts/import_questions.py
```

### Login admin padrão

Definido pelas variáveis `ADMIN_EMAIL` / `ADMIN_PASSWORD` em `docker-compose.yml` (padrão: `admin@oab.com` / `admin123`). **Altere em produção.**

## Desenvolvimento local (sem Docker)

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Variáveis de ambiente

Veja `.env.example` para a lista completa. As principais:

- `ES_HOST`, `MONGO_URI` — endpoints dos bancos
- `JWT_SECRET` — segredo do JWT (obrigatório alterar em produção)
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — credenciais do admin inicial
- `NEXT_PUBLIC_API_URL` — URL pública do backend para o frontend

## Licença

Uso interno / educacional.
