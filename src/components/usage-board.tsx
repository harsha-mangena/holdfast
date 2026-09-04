const ROWS = [
  { name: "Redline Mechanical", trade: "HVAC", gate: "CLEAR", clock: "118d" },
  { name: "Iron Ridge Electric", trade: "Electrical", gate: "HOLD", clock: "−246d" },
  { name: "North Pour Concrete", trade: "Concrete", gate: "WATCH", clock: "18d" },
  { name: "Pinnacle Steel", trade: "Structural", gate: "CLEAR", clock: "64d" },
  { name: "Harbor Glass", trade: "Glazing", gate: "CLEAR", clock: "201d" },
];

export function UsageBoard() {
  return (
    <div className="usage-frame">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <div className="font-display text-lg tracking-wide text-primary">HOLDFAST</div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted">Northfork job 14 · 6:02 a.m.</div>
        </div>
        <div className="flex gap-2 text-[10px] uppercase tracking-wider">
          <span className="rounded-sm bg-ok/15 px-2 py-1 text-ok">3 CLEAR</span>
          <span className="rounded-sm bg-warn/15 px-2 py-1 text-warn">1 WATCH</span>
          <span className="rounded-sm bg-bad/15 px-2 py-1 text-bad">1 HOLD</span>
        </div>
      </div>
      <ul>
        {ROWS.map((r, i) => (
          <li
            key={r.name}
            className={`usage-row flex items-center justify-between gap-3 border-b border-border px-4 py-3 ${r.gate === "HOLD" ? "bg-bad/10" : ""}`}
            style={{ animationDelay: 80 + i * 90 + "ms" }}
          >
            <div className="min-w-0">
              <div className="truncate font-medium">{r.name}</div>
              <div className="text-[11px] text-muted">{r.trade}</div>
            </div>
            <div className="flex items-center gap-4">
              <span className="tabular-nums text-xs text-muted">{r.clock}</span>
              <span
                className={
                  r.gate === "HOLD"
                    ? "font-display text-xl text-bad"
                    : r.gate === "WATCH"
                      ? "font-display text-xl text-warn"
                      : "font-display text-xl text-ok"
                }
              >
                {r.gate}
              </span>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between px-4 py-3 text-xs text-muted">
        <span>Derived from confirmed ACORD × job standards. Nobody typed HOLD.</span>
        <span className="text-primary">Iron Ridge stays in the lot</span>
      </div>
    </div>
  );
}
