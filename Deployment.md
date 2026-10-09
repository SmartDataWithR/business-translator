# Deployment

Frontend und Backend laufen als [Vercel Services](https://vercel.com/docs/services) (Beta) in **einem** Vercel-Projekt unter einer Domain. Die Konfiguration steht in `vercel.json` im Repo-Root.

| Teil | URL |
| --- | --- |
| App | https://business-translator.vercel.app |
| API | dieselbe Domain, Pfad `/api/…` |
| API-Doku (Swagger) | https://business-translator.vercel.app/api/docs (auch `/docs`) |

## Wie es zusammenhängt

`vercel.json` leitet `/api/*` an `backend/` (FastAPI, `main:app`) und alles andere an `frontend/` (Next.js). Das Backend sieht den vollen Pfad (`/api/translate`), alle FastAPI-Routen müssen also unter `/api/` liegen. Weil beide Teile unter derselben Domain laufen, ruft das Frontend die API über relative URLs auf, CORS ist nicht nötig.

Vercel erkennt FastAPI automatisch (`backend/main.py` mit `app`). Die Python-Version kommt aus `backend/.python-version`, die Abhängigkeiten aus `backend/requirements.txt`.

## Erstes Deployment

Im Repo-Root (nicht in `frontend/`). Das Projekt muss das Repo-Root als Root Directory haben, sonst findet Vercel `vercel.json` nicht.

```bash
npx vercel login
npx vercel link --yes --project business-translator   # Team pat-ffms-projects
npx vercel env add OPENROUTER_API_KEY production   # Wert interaktiv eingeben
npx vercel deploy --prod --yes
```

Optional: `OPENROUTER_MODEL` und `RATE_LIMIT`.

Prüfen:

```bash
curl https://business-translator.vercel.app/api/health
```

Lokal laufen beide Services zusammen mit `npx vercel dev` im Repo-Root. Ohne Vercel-CLI geht es wie im README: Backend per uvicorn auf :8000, Frontend per `npm run dev`. `next.config.ts` leitet `/api/*` im Dev-Modus an :8000 weiter.

## Updates

`npx vercel deploy --prod --yes` im Repo-Root. Eine Git-Anbindung mit Auto-Deploy gibt es nicht.

## Grenzen

- **Rate-Limit ist nur eine grobe Bremse.** slowapi zählt im Speicher der jeweiligen Instanz. Vercel startet je nach Last mehrere kurzlebige Instanzen, das Limit ist also keine harte Grenze. Ein gemeinsamer Zähler (z. B. Redis) wäre der nächste Schritt, falls nötig. Die Client-IP kommt aus dem letzten Eintrag von `X-Forwarded-For`, den Vercel mit der echten IP überschreibt.
- Funktionen laufen standardmäßig in `iad1` (USA Ost), maximal 300 s pro Request im Hobby-Plan (der LLM-Timeout liegt bei 30 s).
- Der Hobby-Plan ist nur für nicht-kommerzielle Nutzung gedacht.

## Historie

Ursprünglich war das Backend auf Heroku geplant (Frontend und Backend getrennt, mit CORS und `NEXT_PUBLIC_API_URL`). Das wurde nie umgesetzt und ist vollständig entfernt.
