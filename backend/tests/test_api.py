import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pytest
from fastapi.testclient import TestClient

import llm
from main import RATE_LIMIT, app, limiter
from prompts import build_system_prompt


@pytest.fixture(autouse=True)
def reset_limiter():
    limiter.reset()


client = TestClient(app)


def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["model"] == llm.MODEL


def test_translate_ok(monkeypatch):
    seen = {}

    def fake(text, direction, intensity):
        seen.update(text=text, direction=direction, intensity=intensity)
        return "Business-Text", 42

    monkeypatch.setattr(llm, "translate", fake)
    r = client.post("/api/translate", json={"text": "  Hallo  ", "direction": "to_business"})
    assert r.status_code == 200
    assert r.json() == {"result": "Business-Text", "direction": "to_business", "tokens": 42}
    assert seen == {"text": "Hallo", "direction": "to_business", "intensity": "medium"}


@pytest.mark.parametrize(
    "payload",
    [
        {"text": "", "direction": "to_plain"},
        {"text": "   ", "direction": "to_plain"},
        {"text": "x" * 501, "direction": "to_plain"},
        {"text": "ok", "direction": "sideways"},
        {"text": "ok", "direction": "to_plain", "intensity": "extreme"},
    ],
)
def test_translate_validation(payload):
    assert client.post("/api/translate", json=payload).status_code == 422


def test_translate_llm_error(monkeypatch):
    def boom(*_):
        raise llm.LLMError("kaputt")

    monkeypatch.setattr(llm, "translate", boom)
    r = client.post("/api/translate", json={"text": "hi", "direction": "to_plain"})
    assert r.status_code == 502
    assert r.json()["detail"] == "kaputt"


def test_translate_timeout(monkeypatch):
    def slow(*_):
        raise llm.LLMTimeout("zu langsam")

    monkeypatch.setattr(llm, "translate", slow)
    r = client.post("/api/translate", json={"text": "hi", "direction": "to_plain"})
    assert r.status_code == 504


def test_prompts_differ_by_direction_and_intensity():
    assert "Klartext" in build_system_prompt("to_plain", "medium")
    assert build_system_prompt("to_business", "low") != build_system_prompt("to_business", "high")


def test_rate_limit_per_forwarded_ip(monkeypatch):
    monkeypatch.setattr(llm, "translate", lambda *_: ("ok", None))
    body = {"text": "hi", "direction": "to_plain"}
    limit = int(RATE_LIMIT.split("/")[0])

    def post(forwarded_for):
        return client.post("/api/translate", json=body, headers={"X-Forwarded-For": forwarded_for})

    # Der gefälschte erste Eintrag darf das Limit nicht umgehen, es zählt der letzte (vom Proxy).
    for i in range(limit):
        assert post(f"10.0.0.{i}, 1.1.1.1").status_code == 200
    assert post("9.9.9.9, 1.1.1.1").status_code == 429
    assert post("2.2.2.2").status_code == 200


def test_docs_under_api_prefix():
    assert client.get("/api/docs").status_code == 200
    assert client.get("/api/openapi.json").json()["paths"].keys() == {"/api/health", "/api/translate"}
    r = client.get("/docs", follow_redirects=False)
    assert r.status_code == 307
    assert r.headers["location"] == "/api/docs"
