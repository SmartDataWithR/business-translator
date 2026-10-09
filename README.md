# Firmengeplapper-Übersetzer

Übersetzt Klartext in Business-Speech und zurück. Spezifikation: `ai_docs/PRD.md`.

- `frontend/` – Next.js-Frontend (Port 3000)
- `backend/` – FastAPI-Backend (Port 8000), LLM über OpenRouter

## Start

Backend:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
copy .env.example .env   # OPENROUTER_API_KEY eintragen
.\.venv\Scripts\uvicorn main:app --reload
```

Frontend:

```powershell
cd frontend
copy .env.example .env.local
npm install
npm run dev
```

Tests: `cd backend; .\.venv\Scripts\python -m pytest`
