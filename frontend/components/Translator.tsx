"use client";

import { useEffect, useState } from "react";

type Direction = "to_business" | "to_plain";
type Intensity = "low" | "medium" | "high";
type Health = { model: string; rateLimit: string } | null;

const MAX_LENGTH = 500;

const DIRECTIONS: { value: Direction; label: string; placeholder: string }[] = [
  { value: "to_business", label: "klartext → business", placeholder: "Text eingeben, z. B. Ich habe das vergessen." },
  { value: "to_plain", label: "business → klartext", placeholder: "Text eingeben, z. B. Lass uns das offline synchronisieren." },
];

const INTENSITIES: { value: Intensity; label: string }[] = [
  { value: "low", label: "low" },
  { value: "medium", label: "mid" },
  { value: "high", label: "max" },
];

const EXAMPLES: Record<Direction, string[]> = {
  to_business: ["Ich habe das vergessen.", "Das war ein Fehler von mir.", "Ich habe keine Zeit dafür."],
  to_plain: [
    "Lass uns das offline synchronisieren.",
    "Wir müssen die Learnings aus dem Deep Dive operationalisieren.",
    "Das ist aktuell nicht auf meinem Radar.",
  ],
};

const label = "text-[11px] tracking-[0.1em] text-[#7D8A9C] uppercase";
const panel = "flex min-h-64 flex-col rounded-md border border-[#263040] bg-[#151A21]";
const panelHeader = "flex items-center justify-between border-b border-[#263040] px-4 py-2 text-xs text-[#7D8A9C]";
const focusRing = "focus-visible:ring-2 focus-visible:ring-[#E3B341]/60 focus-visible:outline-none";

function choice(active: boolean, disabled = false) {
  return `rounded border px-3 py-2 text-left transition ${
    active
      ? "border-[#E3B341] text-[#E3B341]"
      : "border-[#263040] text-[#7D8A9C] hover:border-[#3A4A60] hover:text-[#D7DEE8]"
  } ${disabled ? "cursor-not-allowed opacity-40 hover:border-[#263040] hover:text-[#7D8A9C]" : ""}`;
}

export default function Translator() {
  const [direction, setDirection] = useState<Direction>("to_business");
  const [intensity, setIntensity] = useState<Intensity>("medium");
  const [text, setText] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [health, setHealth] = useState<Health>(null);
  const [online, setOnline] = useState<boolean | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [tokens, setTokens] = useState<number | null>(null);

  const config = DIRECTIONS.find((d) => d.value === direction)!;
  const trimmed = text.trim();
  const canSubmit = trimmed.length > 0 && text.length <= MAX_LENGTH && !loading;

  useEffect(() => {
    let active = true;
    async function ping() {
      try {
        const res = await fetch("/api/health");
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!active) return;
        setHealth({ model: data.model, rateLimit: data.rate_limit });
        setOnline(true);
      } catch {
        if (active) setOnline(false);
      }
    }
    ping();
    const id = setInterval(ping, 30000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  function selectDirection(next: Direction) {
    if (next === direction) return;
    setDirection(next);
    setText(result || text);
    setResult("");
    setError("");
  }

  async function translate() {
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    setResult("");
    setCopied(false);
    const started = performance.now();
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed, direction, intensity }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = typeof data.detail === "string" ? data.detail : null;
        throw new Error(
          res.status === 429
            ? "Zu viele Anfragen. Bitte kurz warten und erneut versuchen."
            : (detail ?? "Die Übersetzung ist fehlgeschlagen."),
        );
      }
      setResult(data.result);
      setTokens(typeof data.tokens === "number" ? data.tokens : null);
      setLatency((performance.now() - started) / 1000);
      setOnline(true);
    } catch (e) {
      if (e instanceof TypeError) setOnline(false);
      setError(
        e instanceof TypeError
          ? "Backend nicht erreichbar. Läuft der Server?"
          : e instanceof Error
            ? e.message
            : "Unbekannter Fehler.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Kopieren nicht möglich.");
    }
  }

  return (
    <div className="flex h-dvh flex-col bg-[#0E1116] text-sm text-[#D7DEE8]">
      <header className="flex h-11 shrink-0 items-center gap-4 border-b border-[#263040] bg-[#151A21] px-5 text-xs text-[#7D8A9C]">
        <span className="font-bold text-[#E3B341]">bullshit-translator</span>
        <span>v1.0</span>
        <span className="ml-auto hidden truncate sm:inline">model: {health?.model ?? "–"}</span>
        <span
          className={online === null ? "" : online ? "text-[#3FB950]" : "text-[#F85149]"}
          aria-live="polite"
        >
          ● {online === null ? "verbinde …" : online ? "online" : "offline"}
        </span>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside className="flex shrink-0 flex-col gap-7 overflow-y-auto border-b border-[#263040] bg-[#12161C] p-5 md:w-[280px] md:border-r md:border-b-0">
          <div className="flex flex-col gap-2.5" role="radiogroup" aria-label="Richtung">
            <div className={label}>Richtung</div>
            {DIRECTIONS.map((d) => (
              <button
                key={d.value}
                type="button"
                role="radio"
                aria-checked={d.value === direction}
                onClick={() => selectDirection(d.value)}
                className={`${choice(d.value === direction)} ${focusRing}`}
              >
                {d.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2.5" role="radiogroup" aria-label="Intensität">
            <div className={label}>Intensität</div>
            <div className="flex gap-2">
              {INTENSITIES.map((i) => (
                <button
                  key={i.value}
                  type="button"
                  role="radio"
                  aria-checked={i.value === intensity}
                  disabled={direction !== "to_business"}
                  onClick={() => setIntensity(i.value)}
                  className={`${choice(i.value === intensity, direction !== "to_business")} ${focusRing}`}
                >
                  {i.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <div className={label}>Beispiele</div>
            {EXAMPLES[direction].map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setText(ex)}
                className={`text-left leading-normal text-[#AAB6C5] transition hover:text-[#E3B341] ${focusRing}`}
              >
                {ex}
              </button>
            ))}
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col gap-5 overflow-y-auto p-6">
          <div className="grid flex-1 gap-5 md:grid-cols-2">
            <div className={panel}>
              <label htmlFor="input" className={panelHeader}>
                <span>&gt; input</span>
                <span className={text.length > MAX_LENGTH * 0.9 ? "text-[#F85149]" : ""}>
                  {text.length}/{MAX_LENGTH}
                </span>
              </label>
              <textarea
                id="input"
                maxLength={MAX_LENGTH}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) translate();
                }}
                placeholder={config.placeholder}
                className="w-full flex-1 resize-none bg-transparent p-4 text-[15px] leading-[1.7] text-[#D7DEE8] outline-none placeholder:text-[#4B586B]"
              />
            </div>

            <div className={panel} aria-live="polite">
              <div className={panelHeader}>
                <span>&lt; output</span>
                {result && (
                  <button
                    type="button"
                    onClick={copy}
                    className={`rounded border border-[#263040] px-2.5 py-0.5 text-[11px] text-[#AAB6C5] transition hover:border-[#3A4A60] hover:text-[#D7DEE8] ${focusRing}`}
                  >
                    {copied ? "copied" : "copy"}
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-4 text-[15px] leading-[1.7]">
                {loading ? (
                  <span className="text-[#7D8A9C]">
                    übersetze<span className="animate-pulse">_</span>
                  </span>
                ) : error ? (
                  <p role="alert" className="text-[#F85149]">
                    {error}
                  </p>
                ) : result ? (
                  <p className="whitespace-pre-wrap text-[#E3B341]">{result}</p>
                ) : (
                  <span className="text-[#4B586B]">{"// die Übersetzung erscheint hier"}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={translate}
              disabled={!canSubmit}
              className={`rounded bg-[#E3B341] px-6 py-2.5 font-bold text-[#0E1116] transition hover:bg-[#EBC25E] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#E3B341] ${focusRing}`}
            >
              {loading ? "übersetze …" : "Übersetzen ⏎"}
            </button>
            <span className="text-xs text-[#7D8A9C]">Strg + Enter</span>
          </div>
        </main>
      </div>

      <footer className="flex h-8 shrink-0 items-center gap-6 border-t border-[#263040] bg-[#151A21] px-5 text-[11px] text-[#7D8A9C]">
        <span>latenz {latency !== null ? `${latency.toFixed(1)} s` : "–"}</span>
        <span>tokens {tokens ?? "–"}</span>
        <span>limit {health?.rateLimit.replace("/minute", "/min") ?? "–"}</span>
      </footer>
    </div>
  );
}
