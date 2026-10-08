# PRD: Bullshit-Übersetzer (Business Translator)

## 1. Überblick

Eine Web-App, die normale Sätze per LLM in Business-Speech ("Bullshit-Bingo") übersetzt – und umgekehrt: Business-Floskeln werden in klares, verständliches Deutsch zurückübersetzt.

**Beispiel**
- Normal → Business: "Ich habe das vergessen." → "Dieser Punkt ist im Zuge der Priorisierung temporär aus meinem Fokus gerutscht; ich nehme ihn als Learning mit."
- Business → Normal: "Lass uns das offline synchronisieren." → "Lass uns das später direkt besprechen."

## 2. Ziele

- Unterhaltsames, schnell nutzbares Tool mit minimaler Eingabehürde.
- Zwei Übersetzungsrichtungen mit hoher Textqualität.
- Saubere Trennung von Frontend und Backend (Lernprojekt / Übung).

**Nicht-Ziele (MVP):** Nutzerkonten, Verlauf in Datenbank, Mehrsprachigkeit, Bezahlfunktionen.

## 3. Zielgruppe

Berufstätige, die sich über Business-Sprache amüsieren oder sie verstehen/verwenden wollen; Entwickler-Lernprojekt.

## 4. User Stories

1. Als Nutzer gebe ich einen normalen Satz ein und erhalte eine Business-Speech-Version.
2. Als Nutzer gebe ich Business-Floskeln ein und erhalte eine verständliche Klartext-Version.
3. Als Nutzer wechsle ich mit einem Klick die Übersetzungsrichtung.
4. Als Nutzer kopiere ich das Ergebnis mit einem Klick in die Zwischenablage.
5. Als Nutzer sehe ich eine verständliche Fehlermeldung, wenn die Übersetzung scheitert.

## 5. Funktionale Anforderungen

| ID | Anforderung | Priorität |
|----|-------------|-----------|
| F1 | Texteingabe (max. 500 Zeichen) mit Zeichenzähler | Must |
| F2 | Richtungsumschalter: Normal → Business / Business → Normal | Must |
| F3 | Button "Übersetzen" ruft Backend auf, zeigt Ladezustand | Must |
| F4 | Ergebnisanzeige mit "Kopieren"-Button | Must |
| F5 | Validierung (leere/zu lange Eingabe) im Frontend und Backend | Must |
| F6 | Fehlerbehandlung (LLM-Timeout, API-Fehler) mit Hinweis | Must |
| F7 | Intensitäts-Regler (leicht / mittel / maximal Bullshit) | Should |
| F8 | Beispielsätze zum Anklicken | Could |
| F9 | Dark-Mode | Could |

## 6. Architektur

```
Browser (Next.js)  --HTTP/JSON-->  FastAPI (Python)  --API-->  LLM-Anbieter
```

### Frontend
- Next.js (App Router), TypeScript, Tailwind CSS
- Ordner: `frontend/`
- Eine Hauptseite mit Eingabefeld, Richtungsumschalter, Ergebnisfeld
- Aufruf des Backends über relative URLs (`/api/...`) auf derselben Domain

### Backend
- Python, FastAPI, Pydantic für Request/Response-Validierung
- LLM-Aufruf serverseitig über OpenRouter (OpenAI-kompatible API); API-Key nur im Backend (`.env`, nicht im Repo)
- Kein CORS nötig: Frontend und Backend laufen unter derselben Domain
- Prompt-Logik gekapselt in eigenem Modul (Prompts je Richtung und Intensität)

## 7. API-Spezifikation

### `POST /api/translate`

Request
```json
{
  "text": "Ich habe das vergessen.",
  "direction": "to_business",
  "intensity": "medium"
}
```

- `direction`: `to_business` | `to_plain`
- `intensity`: `low` | `medium` | `high` (optional, Default `medium`)
- `text`: 1–500 Zeichen

Response `200`
```json
{
  "result": "Dieser Punkt ist temporär aus meinem Fokus gerutscht.",
  "direction": "to_business"
}
```

Fehler: `422` (Validierung), `502` (LLM-Fehler), `504` (Timeout) mit `{"detail": "..."}`.

### `GET /api/health`
Liefert `{"status": "ok"}`.

## 8. Prompt-Design

- System-Prompt je Richtung, Ausgabe nur der Übersetzung, ohne Erklärungen.
- `to_business`: Corporate-Jargon (Synergien, Alignment, Learnings, Commitment …), Bedeutung bleibt erhalten, Intensität steuert Dichte der Floskeln.
- `to_plain`: kurzer, direkter, ehrlicher Klartext; Bedeutung erhalten.
- Ausgabesprache: Deutsch.
- Eingabetext wird als Daten behandelt, nicht als Anweisung (Schutz vor Prompt Injection).

## 9. Nicht-funktionale Anforderungen

- Antwortzeit: Ziel < 5 s pro Übersetzung.
- Sicherheit: API-Key nie im Frontend; Eingabelänge begrenzt; einfaches Rate-Limiting pro IP.
- Barrierefreiheit: Labels, Tastaturbedienung, ausreichender Kontrast.
- Responsive: Nutzbar auf Smartphone und Desktop.

## 10. Projektstruktur

```
business-translator/
├── ai_docs/
│   ├── PRD.md
│   ├── features/
│   └── images/
├── frontend/       # Next.js Frontend
└── backend/        # FastAPI (main.py, prompts.py, requirements.txt)
```

## 11. Meilensteine

1. Backend: FastAPI-Grundgerüst, `/api/health`, `/api/translate` mit LLM-Anbindung.
2. Frontend: Next.js-Seite mit Formular und API-Anbindung.
3. Fehlerbehandlung, Validierung, Kopieren-Button.
4. Optional: Intensität, Beispielsätze, Dark-Mode.
5. Tests (Backend-Endpunkte, Prompt-Smoke-Tests) und README.

## 12. Offene Fragen

- ~~LLM-Anbieter~~: OpenRouter (Modell per `OPENROUTER_MODEL` konfigurierbar).
- ~~Deployment-Ziel~~: Vercel, Frontend und Backend als Vercel Services in einem Projekt (siehe `Deployment.md`).
- Soll es später einen Verlauf oder Teilen-Funktion geben?
