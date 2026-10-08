# Bullshit-Übersetzer

Übersetzt Klartext in Business-Speech und zurück. Spezifikation: `ai_docs/PRD.md`.

Live: https://business-translator.vercel.app (API-Doku: `/api/docs`)

- `frontend/` – Next.js-Frontend (Port 3000)
- `backend/` – FastAPI-Backend (Port 8000), LLM über OpenRouter

## Start

Backend:

```bash
cd backend
cp .env.example .env   # OPENROUTER_API_KEY eintragen
uv run --with-requirements requirements.txt uvicorn main:app --reload
```

Frontend (leitet `/api/*` im Dev-Modus an das Backend auf Port 8000 weiter):

```bash
cd frontend
npm install
npm run dev
```

Tests (in `backend/`): `uv run --with-requirements requirements.txt pytest`

Voraussetzung ist [uv](https://docs.astral.sh/uv/). Es legt die Umgebung selbst an, ein eigenes venv ist nicht nötig.

## Deployment

Frontend und Backend laufen gemeinsam in einem Vercel-Projekt, siehe `Deployment.md`. Ein früher geplantes Backend-Hosting auf Heroku wurde nie umgesetzt.
