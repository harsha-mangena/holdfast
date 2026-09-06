import { createFileRoute, Link } from "@tanstack/react-router";
import { LIVE_CREWS } from "@/lib/holdfast/precon";
import { Button } from "@/components/ui-kit";

export const Route = createFileRoute("/live")({ component: Live });

function money(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function Live() {
  const hold = LIVE_CREWS.filter((c) => c.gate === "hold");
  const open = LIVE_CREWS.reduce((s, c) => s + c.remaining, 0);

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <Link to="/" className="font-display text-2xl text-primary">
          Holdfast
        </Link>
        <Link to="/demo">
          <Button className="min-h-10">Run the demo</Button>
        </Link>
      </header>
      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-primary">Sample jobsite</p>
          <h1 className="font-display text-4xl sm:text-5xl">Tuesday morning. Who goes through.</h1>
          <p className="mt-2 max-w-xl text-sm text-muted">
            {hold.length} HOLD. {money(open)} still open. This is the live sample — not a paying GC.
          </p>
        </div>

        <ul className="divide-y divide-border border border-border bg-surface">
          {LIVE_CREWS.map((c) => (
            <li key={c.name} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div className="min-w-0">
                <div className="truncate font-medium">{c.name}</div>
                <div className="text-xs text-muted">
                  {c.trade} · {c.why}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {c.remaining ? <span className="text-sm tabular-nums text-warn">{money(c.remaining)}</span> : null}
                <span
                  className={
                    c.gate === "hold" ? "font-display text-xl text-bad" : c.gate === "watch" ? "font-display text-xl text-warn" : "font-display text-xl text-ok"
                  }
                >
                  {c.gate.toUpperCase()}
                </span>
              </div>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted">Five crews with no paper are one line, not five copies of the same scream.</p>
      </main>
    </div>
  );
}
