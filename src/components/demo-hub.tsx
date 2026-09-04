import type { ReactNode } from "react";

const NODES = [
  { id: "clerk", label: "Clerk", sub: "Agent", area: "clerk" },
  { id: "acord", label: "ACORD", sub: "PDF", area: "acord" },
  { id: "confirm", label: "Confirm", sub: "Human", area: "confirm" },
  { id: "subs", label: "Subs", sub: "Trades", area: "subs" },
  { id: "gate", label: "Gate", sub: "HOLD", area: "gate" },
  { id: "chase", label: "Chase", sub: "Call", area: "chase" },
  { id: "finance", label: "Finance", sub: "Open $", area: "finance" },
] as const;

export function DemoHub({
  active,
  children,
}: {
  active: string | string[];
  children: ReactNode;
}) {
  const on = new Set(Array.isArray(active) ? active : [active]);
  return (
    <div className="hub-map">
      {NODES.map((n) => (
        <div
          key={n.id}
          className={on.has(n.id) || on.has("all") ? "hub-node is-on" : "hub-node"}
          style={{ gridArea: n.area }}
        >
          <div className="hub-dot" />
          <div>
            <div className="font-display text-lg leading-none">{n.label}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted">{n.sub}</div>
          </div>
        </div>
      ))}
      <div className="hub-tablet">{children}</div>
    </div>
  );
}
