import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { seedSampleJob } from "@/lib/holdfast/actions";
import { AuthModal } from "@/components/auth-modal";
import { DemoHub } from "@/components/demo-hub";
import { Button } from "@/components/ui-kit";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/demo")({ component: Demo });

const CREW = [
  { name: "Iron Ridge Electric", gate: "HOLD", open: "$12,500", why: "GL expired · retainage" },
  { name: "Redline Mechanical", gate: "CLEAR", open: "$0", why: "In force" },
  { name: "North Pour Concrete", gate: "WATCH", open: "$4,200", why: "WC in 18 days" },
  { name: "Pinnacle Steel", gate: "CLEAR", open: "$890", why: "In force" },
];

function Demo() {
  const nav = useNavigate();
  const [scene, setScene] = useState(0);
  const [modal, setModal] = useState<string | null>(null);
  const last = 4;

  useEffect(() => {
    if (scene === 2 || scene === last) return;
    const t = window.setTimeout(() => setScene((s) => Math.min(s + 1, last)), scene === 3 ? 4000 : 4200);
    return () => window.clearTimeout(t);
  }, [scene, last]);

  function afterAuth() {
    void seedSampleJob()
      .catch(() => undefined)
      .finally(() => void nav({ to: "/app" }));
  }

  const active =
    scene === 0
      ? "subs"
      : scene === 1
        ? "acord"
        : scene === 2
          ? "confirm"
          : scene === 3
            ? ["gate", "confirm", "acord"]
            : "all";

  return (
    <div className="relative min-h-dvh overflow-hidden bg-bg text-fg">
      <header className="relative z-20 flex items-center justify-between px-4 py-4 sm:px-8">
        <Link to="/" className="font-display text-xl tracking-wide text-primary">
          HOLDFAST
        </Link>
        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-muted">
          <span className="hidden sm:inline">Live demo · no account</span>
          <ThemeToggle />
          <Link to="/login" className="text-fg">
            Sign in
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl items-center gap-6 px-4 pb-20 pt-2 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="order-1 lg:order-1">
          <DemoHub active={active}>
            <div className="scene-fade" key={scene}>
              <Tablet scene={scene} />
            </div>
          </DemoHub>
        </div>
        <div className="order-2">
          <Copy
            scene={scene}
            onNext={() => setScene((s) => Math.min(s + 1, last))}
            onWatch={() =>
              setModal(
                "Overnight watch needs an account. Sign in and we load Iron Ridge on your board — HOLD plus the open retainage.",
              )
            }
            onAgain={() => setScene(0)}
          />
        </div>
      </div>

      <div className="fixed bottom-5 left-1/2 z-20 flex -translate-x-1/2 gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <button
            key={i}
            type="button"
            aria-label={"Scene " + (i + 1)}
            className={`h-1.5 w-8 rounded-full ${i === scene ? "bg-primary" : "bg-border"}`}
            onClick={() => setScene(i)}
          />
        ))}
      </div>

      <AuthModal open={Boolean(modal)} reason={modal ?? ""} onClose={() => setModal(null)} onAuthed={afterAuth} />
    </div>
  );
}

function Copy({
  scene,
  onNext,
  onWatch,
  onAgain,
}: {
  scene: number;
  onNext: () => void;
  onWatch: () => void;
  onAgain: () => void;
}) {
  if (scene === 0) {
    return (
      <div>
        <p className="rise rise-1 text-[11px] uppercase tracking-[0.32em] text-primary">Jobsite · 6:02 a.m.</p>
        <h1 className="rise rise-2 mt-3 font-display text-[clamp(2.4rem,6vw,4.4rem)] font-semibold leading-[0.92]">
          Who goes through the fence?
        </h1>
        <p className="rise rise-3 mt-4 max-w-md text-muted">
          Iron Ridge is in the lot. GL expired January 1. The spreadsheet still says compliant. That is the claim.
        </p>
        <button type="button" className="rise rise-4 mt-8 text-sm text-primary" onClick={onNext}>
          Follow the ACORD →
        </button>
      </div>
    );
  }
  if (scene === 1) {
    return (
      <div>
        <p className="text-[11px] uppercase tracking-[0.28em] text-primary">Ingest</p>
        <h2 className="mt-2 font-display text-5xl leading-[0.95]">The PDF is the evidence.</h2>
        <p className="mt-4 max-w-md text-muted">
          Text layer plus the page image. Original never changes. A typed status is void.
        </p>
        <button type="button" className="mt-8 text-sm text-primary" onClick={onNext}>
          Skip ahead →
        </button>
      </div>
    );
  }
  if (scene === 2) {
    return (
      <div>
        <p className="text-[11px] uppercase tracking-[0.28em] text-primary">Confirm — mandatory</p>
        <h2 className="mt-2 font-display text-5xl leading-[0.95]">OCR is a draft. You own the date.</h2>
        <p className="mt-4 max-w-md text-muted">
          Exp 01/01/2026. Additional insured: yes. Waiver: missing. The model cannot stamp CLEAR.
        </p>
        <Button className="mt-8 min-h-12" onClick={onNext}>
          Confirm — derive the gate
        </Button>
      </div>
    );
  }
  if (scene === 3) {
    return (
      <div>
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted">Derived · never typed</p>
        <h2 className="mt-2 font-display text-5xl leading-[0.95]">HOLD. They stay in the lot.</h2>
        <p className="mt-4 max-w-md text-muted">
          General liability expired. Workers’ comp not on file. The super does not argue with a checkbox.
        </p>
      </div>
    );
  }
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.28em] text-primary">Board + finance</p>
      <h2 className="mt-2 font-display text-5xl leading-[0.95]">One HOLD. $17,590 still open.</h2>
      <p className="mt-4 max-w-md text-muted">
        Gate and books on the same sub. Chase the paper and the retainage. The clerk reads both.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button className="min-h-12" onClick={onWatch}>
          Watch this overnight
        </Button>
        <Button tone="ghost" className="min-h-12" onClick={onAgain}>
          Run it again
        </Button>
      </div>
    </div>
  );
}

function Tablet({ scene }: { scene: number }) {
  if (scene === 0) {
    return (
      <div>
        <p className="text-[10px] uppercase tracking-wider text-primary">Northfork GC</p>
        <p className="mt-2 font-display text-2xl leading-none">4 trades on site</p>
        <p className="mt-2 text-xs text-muted">Fence opens in 18 minutes. One of them is already expired.</p>
        <div className="mt-3 h-16 overflow-hidden rounded-sm bg-bg">
          <div className="scan-line h-full" />
        </div>
      </div>
    );
  }
  if (scene === 1) {
    return (
      <div className="bg-paper p-2 text-ink">
        <div className="text-[9px] uppercase tracking-wider text-ink/50">ACORD 25</div>
        <div className="mt-1 font-display text-xl leading-none">Iron Ridge Electric</div>
        <div className="relative mt-2 overflow-hidden text-[11px]">
          Hartford · GL-4419
          <br />
          Exp 01/01/26 · $1M / $2M
          <div className="scan-line pointer-events-none absolute inset-x-0 top-0 h-6" />
        </div>
      </div>
    );
  }
  if (scene === 2) {
    return (
      <div className="space-y-1.5 text-[11px]">
        <Row k="Named insured" v="Iron Ridge Electric LLC" />
        <Row k="GL exp" v="01/01/2026" />
        <Row k="AI" v="Yes" />
        <Row k="WOS" v="Missing" />
      </div>
    );
  }
  if (scene === 3) {
    return (
      <div className="grid place-items-center py-4">
        <div className="stamp-in rotate-[-10deg] border-4 border-bad px-4 py-1 font-display text-5xl text-bad">HOLD</div>
      </div>
    );
  }
  return (
    <div>
      <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted">
        <span>Finance</span>
        <span className="text-warn">$17,590 open</span>
      </div>
      <ul className="mt-2 space-y-1">
        {CREW.map((c) => (
          <li key={c.name} className="flex items-center justify-between gap-2 text-[11px]">
            <span className="truncate">{c.name.split(" ")[0]}</span>
            <span className={c.gate === "HOLD" ? "text-bad" : c.gate === "WATCH" ? "text-warn" : "text-ok"}>{c.gate}</span>
            <span className="tabular-nums text-muted">{c.open}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2 border-b border-border pb-1">
      <span className="text-muted">{k}</span>
      <span>{v}</span>
    </div>
  );
}
