import { createFileRoute, Link } from "@tanstack/react-router";
import { SignedIn, SignedOut } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button, StatusChip } from "@/components/ui-kit";
import { UsageBoard } from "@/components/usage-board";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { isPending } = useCurrentUserState();
  return (
    <div className="min-h-dvh overflow-x-hidden bg-bg text-fg">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <a href="#top" className="font-display text-2xl tracking-wide text-primary">
            HOLDFAST
          </a>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
            <a href="#why">Why</a>
            <Link to="/demo">See it run</Link>
            <a href="#pricing">Pricing</a>
            {isPending ? (
              <div className="h-8 w-16 animate-pulse rounded-md bg-raised" />
            ) : (
              <>
                <SignedOut>
                  <Link to="/login">Sign in</Link>
                </SignedOut>
                <SignedIn>
                  <Link to="/app">Board</Link>
                </SignedIn>
              </>
            )}
            <Link to="/demo">
              <Button className="min-h-10">Get a demo</Button>
            </Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main id="top">
        <section className="mx-auto max-w-6xl px-4 pt-6 sm:pt-10">
          <UsageBoard />
        </section>

        <section className="mx-auto max-w-3xl px-4 py-14 text-center">
          <p className="text-[11px] uppercase tracking-[0.28em] text-primary">The 6 a.m. gate</p>
          <h1 className="mt-3 font-display text-[clamp(2.4rem,7vw,4.6rem)] font-semibold leading-[0.92]">
            You already collect the COI. You still send HOLD through the fence.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            Brokers file. Jones archives. Spreadsheets lie. The empty slot is dispatch: CLEAR, WATCH, or HOLD — derived
            from the PDF, never typed. That is as necessary as a POS on the line.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/demo">
              <Button className="min-h-12 w-full sm:w-auto">See it run — no account</Button>
            </Link>
            <a href="#pricing">
              <Button tone="ghost" className="min-h-12 w-full sm:w-auto">
                Plans
              </Button>
            </a>
          </div>
        </section>

        <section className="border-y border-border bg-surface">
          <div className="mx-auto grid max-w-6xl gap-px sm:grid-cols-3">
            {[
              ["Saturated", "COI inboxes, broker portals, enterprise trackers."],
              ["Unsaturated", "Who is allowed on the pad this morning."],
              ["Holdfast", "Derived gate. Human confirm. Evidence pack."],
            ].map(([t, d]) => (
              <div key={t} className="bg-surface px-6 py-8">
                <div className="text-[11px] uppercase tracking-[0.2em] text-primary">{t}</div>
                <p className="mt-2 font-display text-2xl leading-tight">{d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {[
              ["12", "subs on the job"],
              ["1", "HOLD at the fence"],
              ["$1M", "GL required"],
              ["0", "typed statuses"],
              ["30d", "first alert"],
            ].map(([n, l]) => (
              <div key={l} className="border border-border bg-surface px-3 py-4">
                <div className="font-display text-3xl tabular-nums">{n}</div>
                <div className="mt-1 text-[11px] uppercase tracking-wider text-muted">{l}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="why" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-8">
          <div className="grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2">
            <Why n="01" t="The job still runs on inboxes" d="PDFs die in email. Spreadsheets go stale the week after bid day. You find out at the claim." />
            <Why n="02" t="A missed date is a coverage gap" d="If GL expired yesterday it is not coverage. Holdfast treats that as HOLD, not probably fine." />
            <Why n="03" t="No compliant checkbox" d="Status is computed from the original plus your standards every time you look." />
            <Why n="04" t="OCR is a draft" d="We read the page. A human confirms. Wrong dates never auto-save. The model cannot stamp CLEAR." />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-10">
          <p className="text-[11px] uppercase tracking-[0.22em] text-primary">Five states. Derived.</p>
          <h2 className="mt-1 font-display text-3xl sm:text-4xl">The board, not a folder.</h2>
          <div className="mt-6 grid gap-2 sm:grid-cols-5">
            {(["compliant", "expiring", "expired", "missing", "insufficient"] as const).map((s) => (
              <div key={s} className="tile-hover min-h-24 border border-border bg-surface p-3">
                <StatusChip status={s} />
                <p className="mt-3 text-xs leading-relaxed text-muted">{BOARD[s]}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-24">
          <h2 className="font-display text-3xl sm:text-4xl">Plans that follow vendor count</h2>
          <p className="mt-2 max-w-xl text-sm text-muted">One axis: how many subs you watch. Seats are not the meter.</p>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <Plan
              name="Starter"
              price="$49"
              blurb="Most GCs. 25 vendors, email alerts, CSV/PDF export."
              points={["Derived status board", "Upload + confirm", "30 / 14 / 7 / 1 day alerts", "Audit log"]}
            />
            <Plan
              name="Growth"
              price="$149"
              blurb="When the job book is no longer a spreadsheet."
              points={["Everything in Starter", "Unlimited subs", "Finance desk + chase", "Priority extraction"]}
            />
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-4 py-8 text-center text-xs text-muted">
        Holdfast, Inc. · processor, not a carrier · <Link to="/privacy">Privacy</Link> · <Link to="/terms">Terms</Link>
      </footer>
    </div>
  );
}

const BOARD: Record<string, string> = {
  compliant: "Limits, dates, AI, and WOS all hold.",
  expiring: "Inside 30 days. Email starts now.",
  expired: "The policy date is already past.",
  missing: "Required line never arrived.",
  insufficient: "On file — under the required limit.",
};

function Why({ n, t, d }: { n: string; t: string; d: string }) {
  return (
    <div className="tile-hover bg-surface p-5 sm:p-6">
      <div className="font-display text-primary">{n}</div>
      <h3 className="mt-1 font-display text-2xl">{t}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{d}</p>
    </div>
  );
}

function Plan({
  name,
  price,
  blurb,
  points,
}: {
  name: string;
  price: string;
  blurb: string;
  points: string[];
}) {
  return (
    <div className="group border border-border bg-surface p-6 transition-[border-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-primary hover:shadow-[0_12px_32px_rgb(0_0_0/0.08)]">
      <div className="font-display text-2xl">{name}</div>
      <div className="mt-1 font-display text-4xl">
        {price}
        <span className="text-lg text-muted">/mo</span>
      </div>
      <p className="mt-3 text-sm text-muted">{blurb}</p>
      <ul className="mt-4 space-y-2 text-sm">
        {points.map((p) => (
          <li key={p} className="border-t border-border pt-2">
            {p}
          </li>
        ))}
      </ul>
      <Link to="/demo">
        <Button className="mt-6 min-h-12 w-full" tone="ghost">
          See it run
        </Button>
      </Link>
    </div>
  );
}
