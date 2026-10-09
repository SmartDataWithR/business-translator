import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field, field_validator
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

load_dotenv()

import llm  # noqa: E402  (nach load_dotenv, damit OPENROUTER_MODEL gelesen wird)
from prompts import Direction, Intensity  # noqa: E402

MAX_TEXT_LENGTH = 500
RATE_LIMIT = os.getenv("RATE_LIMIT", "20/minute")


def client_ip(request: Request) -> str:
    # Hinter dem Vercel-Proxy ist request.client nicht der Nutzer. Vercel überschreibt
    # X-Forwarded-For mit der Client-IP. Andere Proxys hängen sie hinten an, frühere
    # Einträge könnte der Client gefälscht haben, daher zählt der letzte.
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[-1].strip()
    return get_remote_address(request)


# Zähler im Speicher der Instanz: Auf Vercel laufen mehrere kurzlebige Instanzen,
# das Limit ist dort also nur eine grobe Bremse und keine harte Grenze.
limiter = Limiter(key_func=client_ip)

# Doku unter /api/, damit vercel.json sie wie alle API-Routen ans Backend leitet.
app = FastAPI(
    title="Bullshit-Übersetzer API",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.get("/docs", include_in_schema=False)
def docs_redirect() -> RedirectResponse:
    return RedirectResponse("/api/docs")


class TranslateRequest(BaseModel):
    text: str = Field(max_length=MAX_TEXT_LENGTH)
    direction: Direction
    intensity: Intensity = "medium"

    @field_validator("text")
    @classmethod
    def not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Text darf nicht leer sein.")
        return value


class TranslateResponse(BaseModel):
    result: str
    direction: Direction
    tokens: int | None = None


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "model": llm.MODEL, "rate_limit": RATE_LIMIT}


@app.post("/api/translate", response_model=TranslateResponse)
@limiter.limit(RATE_LIMIT)
def translate(request: Request, body: TranslateRequest) -> TranslateResponse:
    try:
        result, tokens = llm.translate(body.text, body.direction, body.intensity)
    except llm.LLMTimeout as exc:
        raise HTTPException(status_code=504, detail=str(exc)) from exc
    except llm.LLMError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return TranslateResponse(result=result, direction=body.direction, tokens=tokens)
