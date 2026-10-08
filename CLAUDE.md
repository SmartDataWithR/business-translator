# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projekt

„Bullshit-Übersetzer“: übersetzt deutschen Klartext per LLM in Business-Speech und zurück. Die Spezifikation (Anforderungen, API, Prompt-Design) steht in `ai_docs/PRD.md`, Hosting und URLs in `Deployment.md`.

- `backend/` ist FastAPI (Python 3.13, Port 8000). Das LLM läuft über OpenRouter mit dem `openai`-SDK (OpenAI-kompatible API).
- `frontend/` ist Next.js 16 mit App Router, React 19, Tailwind 4 und Turbopack (Port 3000).

## Befehle

Python läuft ausschließlich über `uv`, **niemals `pip install`** (ein Hook blockiert Bash-Befehle, die das enthalten).

Backend (in `backend/`, vorher `.env` aus `.env.example` anlegen und `OPENROUTER_API_KEY` eintragen):

```bash
uv run --with-requirements requirements.txt uvicorn main:app --reload
uv run --with-requirements requirements.txt pytest                                  # alle Tests
uv run --with-requirements requirements.txt pytest tests/test_api.py::test_health   # einzelner Test
```

Frontend (in `frontend/`, braucht keine Env-Datei; `next dev` leitet `/api/*` an `localhost:8000` weiter):

```bash
npm install
npm run dev
npm run build
npm run lint
```

Für das Frontend gibt es keine Tests.

## Architektur

Der Ablauf ist `Translator.tsx` → `POST /api/translate` (`main.py`) → `llm.translate()` → `prompts.py` (System-Prompt) → OpenRouter.

- **`backend/main.py`** enthält die Pydantic-Validierung (Text 1–500 Zeichen, wird getrimmt), das Rate-Limiting per IP mit slowapi (`RATE_LIMIT`, Zähler im Speicher der Instanz, auf Vercel also nur eine grobe Bremse). CORS gibt es nicht, weil Frontend und Backend unter derselben Domain laufen. Es übersetzt `llm.LLMTimeout` in 504 und `llm.LLMError` in 502. Die Client-IP fürs Limit kommt aus dem **letzten** Eintrag von `X-Forwarded-For` (`client_ip`), weil Vercel den Header mit der echten IP überschreibt.
- **`backend/llm.py`** kapselt den OpenRouter-Client (lazy erzeugt, 30 s Timeout). `MODEL` wird beim Import aus `OPENROUTER_MODEL` gelesen. Deshalb importiert `main.py` das Modul `llm` erst nach `load_dotenv()`.
- **`backend/prompts.py`** liefert den System-Prompt je Richtung (`to_business`/`to_plain`) und Intensität. Die Intensität wirkt nur bei `to_business`. Der Nutzertext wird in `<text>`-Tags verpackt und laut Prompt als Daten behandelt (Schutz vor Prompt Injection).
- **Tests** (`backend/tests/test_api.py`) rufen nie das echte LLM auf, sondern ersetzen `llm.translate` per `monkeypatch`. Das klappt nur, weil `main.py` die Funktion über `llm.translate(...)` aufruft. Diesen Aufrufstil beibehalten und nicht auf `from llm import translate` umstellen. Eine autouse-Fixture setzt den Limiter vor jedem Test zurück.
- **`frontend/components/Translator.tsx`** ist eine einzige Client-Komponente mit der ganzen UI. `app/page.tsx` rendert nur diese Komponente. Sie ruft die API über relative URLs (`/api/...`) auf. In Produktion routet `vercel.json`, lokal die Dev-Rewrite in `next.config.ts`. Die Komponente fragt alle 30 s `/api/health` ab, die Antwort enthält Modell und Rate-Limit für die Statusleiste. Farben sind als Tailwind-Arbitrary-Values (`#…`) direkt im Code gesetzt.

### Vertrag zwischen Frontend und Backend

Es gibt keine gemeinsamen Typen. Folgendes ist **doppelt** gepflegt und muss bei Änderungen auf beiden Seiten angepasst werden:

- `Direction`, `Intensity` und die maximale Länge 500: `prompts.py`/`main.py` gegenüber den Konstanten in `Translator.tsx`
- Antwortfelder: `result`, `direction`, `tokens` bei translate und `status`, `model`, `rate_limit` (snake_case) bei health
- Fehler: Das Frontend zeigt `detail` aus der Fehlerantwort an, wenn es ein String ist. So landen die deutschen Meldungen aus `llm.py` (502/504) direkt in der UI. Bei 422-Validierungsfehlern ist `detail` dagegen eine Liste, dann greift der Fallback im Frontend.

## Frontend-Hinweis (aus `frontend/AGENTS.md`)

Next.js 16 hat Breaking Changes gegenüber dem Trainingswissen. Vor Änderungen am Frontend die passende Anleitung unter `frontend/node_modules/next/dist/docs/` lesen und Deprecation-Hinweise beachten. `next.config.ts` aktiviert `cacheComponents` und `partialPrefetching` und bindet Tailwind über eine Turbopack-Loader-Regel (`@tailwindcss/turbopack`) für `*.css` ein, nicht über PostCSS. `next dev` schreibt den Block in `AGENTS.md` bei Bedarf neu.

## Deployment

Frontend und Backend laufen gemeinsam in einem Vercel-Projekt (Vercel Services, Details in `Deployment.md`). `vercel.json` im Repo-Root leitet `/api/*` an `backend/` (`main:app`) und den Rest an `frontend/`. Das Backend sieht den vollen Pfad, daher müssen alle FastAPI-Routen unter `/api/` bleiben. Auch die Swagger-Doku liegt deshalb unter `/api/docs` (plus `/api/redoc`, `/api/openapi.json`). `/docs` leitet per FastAPI-Redirect dorthin, `vercel.json` routet `/docs` dafür zusätzlich ans Backend. Deployt wird per `npx vercel deploy --prod --yes` im **Repo-Root**, Auto-Deploy gibt es nicht. Einzige Pflicht-Variable ist `OPENROUTER_API_KEY`. Ein früher geplantes Heroku-Backend wurde nie umgesetzt und ist entfernt.

## Projekt-Skills

- `create-feature` legt Feature-Specs unter `ai_docs/features/NNN_<slug>.md` an.
- `vercel-react-best-practices` enthält Regeln für React- und Next.js-Code.
