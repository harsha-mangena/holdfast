import { useEffect, useState } from "react";
import { LIVE_CREWS, liveJobs } from "@/lib/holdfast/precon";

const TABS = ["Board", "Drop", "Jobs"] as const;

export function ProductWindow() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Board");
  const [hold, setHold] = useState(true);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const id = window.setInterval(() => {
      setTab((t) => TABS[(TABS.indexOf(t) + 1) % TABS.length]);
    }, 4800);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (tab !== "Board") return;
    const id = window.setInterval(() => setHold((v) => !v), 2400);
    return () => window.clearInterval(id);
  }, [tab]);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-[0_24px_60px_-32px_rgba(28,22,18,0.45)]">
      <div className="flex items-center gap-2 border-b border-border bg-raised px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-bad/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-warn/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-ok/70" />
        <span className="ml-2 text-[11px] text-muted">holdfast.app / live</span>
      </div>
      <div className="flex gap-1 border-b border-border px-3 pt-2">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`relative min-h-10 px-3 text-sm ${tab === t ? "text-fg" : "text-muted"}`}
          >
            {t}
            {tab === t ? <span className="absolute inset-x-2 bottom-0 h-0.5 bg-primary tab-line" /> : null}
          </button>
        ))}
      </div>
      <div className="min-h-[280px] p-4">
        {tab === "Board" ? <BoardPane hold={hold} /> : null}
        {tab === "Drop" ? <DropPane /> : null}
        {tab === "Jobs" ? <JobsPane /> : null}
      </div>
    </div>
  );
}

function BoardPane({ hold }: { hold: boolean }) {
  const rows = LIVE_CREWS.slice(0, 4);
  return (
    <ul className="divide-y divide-border border border-border">
      {rows.map((c) => (
        <li key={c.name} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
          <span className="truncate">{c.name}</span>
          <span
            className={
              c.gate === "hold" && hold
                ? "font-display text-lg text-bad"
                : c.gate === "watch"
                  ? "font-display text-lg text-warn"
                  : "font-display text-lg text-ok"
            }
          >
            {c.gate.toUpperCase()}
          </span>
        </li>
      ))}
      <li className="px-3 py-2 text-xs text-muted">Five crews with no paper · one line at the bottom</li>
    </ul>
  );
}

function DropPane() {
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
      <div className="border border-dashed border-primary/50 bg-raised p-4">
        <p className="text-[11px] uppercase tracking-wider text-primary">Drop link</p>
        <p className="mt-2 font-display text-2xl">Sub never logs in.</p>
        <p className="mt-1 text-sm text-muted">PDF lands. OCR is a draft. You confirm the date. Then HOLD stamps.</p>
      </div>
      <div className="grid place-items-center border border-border bg-paper p-4 text-ink">
        <div className="text-[10px] uppercase tracking-wider">ACORD 25</div>
        <div className="font-display text-3xl text-bad">EXPIRED</div>
        <div className="text-xs">GL · 2026-01-01</div>
      </div>
    </div>
  );
}

function JobsPane() {
  const jobs = liveJobs();
  return (
    <ul className="space-y-2">
      {jobs.map((j) => (
        <li key={j.id} className="flex items-center justify-between gap-2 border border-border px-3 py-2 text-sm">
          <span className="truncate">{j.name}</span>
          <span className={j.call === "bid" ? "text-ok" : "text-warn"}>{j.call === "hold-scope" ? "HOLD SCOPE" : j.call.toUpperCase()}</span>
        </li>
      ))}
    </ul>
  );
}
