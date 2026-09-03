import { useEffect, useState } from "react";

const FLOW = [
  { n: "01", t: "Ingest", d: "The PDF lands. Original never changes.", kind: "ingest" as const },
  { n: "02", t: "Confirm", d: "You own every date before it counts.", kind: "confirm" as const },
  { n: "03", t: "Derive", d: "The board stamps expired. Nobody typed it.", kind: "derive" as const },
];

export function FlowStrip() {
  const [active, setActive] = useState(0);
  const [play, setPlay] = useState(0);

  useEffect(() => {
    const t = window.setInterval(() => {
      setActive((n) => {
        const next = (n + 1) % FLOW.length;
        setPlay((p) => p + 1);
        return next;
      });
    }, 3400);
    return () => window.clearInterval(t);
  }, []);

  return (
    <ol className="flow-board" aria-label="How Holdfast works">
      {FLOW.map((step, i) => (
        <span key={step.n} className="contents">
          {i > 0 ? (
            <li className="flow-gap" aria-hidden="true">
              <span className="flow-gap-fill" style={{ width: active >= i ? "100%" : "0%" }} />
            </li>
          ) : null}
          <li className={i === active ? "flow-step is-on" : "flow-step"}>
            <div className="flow-node">
              <Mini kind={step.kind} on={i === active} play={play} />
            </div>
            <div className="mt-3 text-center">
              <div className="text-[11px] uppercase tracking-[0.2em] text-primary">{step.n}</div>
              <div className="font-display text-2xl">{step.t}</div>
              <p className="mt-1 text-sm text-muted">{step.d}</p>
            </div>
          </li>
        </span>
      ))}
    </ol>
  );
}

function Mini({
  kind,
  on,
  play,
}: {
  kind: "ingest" | "confirm" | "derive";
  on: boolean;
  play: number;
}) {
  if (kind === "ingest") {
    return (
      <span key={on ? play : "off"} className={`scene-ingest ${on ? "on" : ""}`}>
        <span className="pdf-sheet">
          <span className="pdf-rule" />
          <span className="pdf-rule" />
          <span className="pdf-rule short" />
          <span className="pdf-scan" />
        </span>
      </span>
    );
  }
  if (kind === "confirm") {
    return (
      <span key={on ? play : "off"} className={`scene-confirm ${on ? "on" : ""}`}>
        <span className="date-row">01 / 01 / 25</span>
        <span className="date-row write">01 / 01 / 26</span>
        <span className="date-check" />
      </span>
    );
  }
  return (
    <span key={on ? play : "off"} className={`scene-derive ${on ? "on" : ""}`}>
      <span className="derive-bits">
        <span>PDF</span>
        <span className="derive-times">×</span>
        <span>rules</span>
      </span>
      <span className="derive-stamp">EXPIRED</span>
    </span>
  );
}

export function StepDots({
  steps,
  current,
}: {
  steps: string[];
  current: string;
}) {
  const i = Math.max(0, steps.indexOf(current));
  return (
    <ol className="mt-4 flex items-center gap-2" aria-label="Demo progress">
      {steps.map((s, n) => (
        <li key={s} className="flex items-center gap-2">
          {n > 0 ? <span className="flow-rail-mini" aria-hidden="true" /> : null}
          <span className={`step-dot ${n <= i ? "on" : ""}`} title={s} />
        </li>
      ))}
    </ol>
  );
}
