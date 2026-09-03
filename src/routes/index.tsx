import { createFileRoute, Link } from "@tanstack/react-router";
import { SignedIn, SignedOut } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button, StatusChip } from "@/components/ui-kit";
import { DemoPlay } from "@/components/demo-play";
import { FlowStrip } from "@/components/flow-dots";
import { CoiCarousel } from "@/components/coi-carousel";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { isPending } = useCurrentUserState();
  return (
    <div className="min-h-dvh overflow-x-hidden bg-bg text-fg">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <a href="#top" className="font-display text-2xl tracking-wide text-primary">
            HOLDFAST
          </a>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
            <a href="#why">Why</a>
            <a href="#demo">Demo</a>
            <a href="#pricing">Pricing</a>
            <Link to="/privacy">Privacy</Link>
            {isPending ? (
              <div className="h-8 w-16 animate-pulse rounded-md bg-raised" />
            ) : (
              <>
                <SignedOut>
                  <Link to="/login" className="text-fg">
                    Sign in
                  </Link>
                </SignedOut>
                <SignedIn>
                  <Link to="/app" className="text-fg">
                    Board
                  </Link>
                </SignedIn>
              </>
            )}
          </nav>
        </div>
      </header>

      <main id="top" className="mx-auto max-w-6xl px-4 pb-24">
        <section className="grid items-center gap-10 py-10 sm:py-16 md:grid-cols-2">
          <div>
            <p className="rise rise-1 text-[11px] uppercase tracking-[0.28em] text-primary">
              For GCs and property managers
            </p>
            <h1 className="rise rise-2 mt-3 max-w-3xl font-display text-[clamp(2.25rem,8vw,4.4rem)] font-semibold leading-[0.95] tracking-tight">
              An expired certificate is an uninsured claim waiting to happen.
            </h1>
            <p className="rise rise-3 mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              Subs email PDFs. Someone dumps them in a drive. Nobody watches the date. One lapsed GL and
              the next injury on your job is your problem. Holdfast reads the COI, you confirm the fields,
              and status is derived — never typed.
            </p>
            <div className="rise rise-4 mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#demo">
                <Button className="min-h-12 w-full sm:w-auto">Start the demo — no account</Button>
              </a>
              <a href="#pricing">
                <Button tone="ghost" className="min-h-12 w-full sm:w-auto">
                  See plans
                </Button>
              </a>
            </div>
          </div>
          <CoiCarousel />
        </section>

        <div className="beam mb-8" />
        <FlowStrip />
        <div className="beam mb-10 mt-8" />

        <section className="border border-border bg-surface p-5 sm:p-8">
          <p className="text-[11px] uppercase tracking-[0.22em] text-primary">One kernel · two clocks</p>
          <h2 className="mt-1 font-display text-3xl sm:text-4xl">Do not dispatch a HOLD. Do not pay a voidable bill.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            Holdfast and Laytime are the same refusal in two yards. A typed status is void. The original document plus
            the rule is the only evidence. The clock is the customer's real job.
          </p>
          <div className="mt-6 grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2">
            <div className="bg-bg p-5">
              <div className="text-[11px] uppercase tracking-[0.2em] text-primary">Holdfast · jobsite</div>
              <h3 className="mt-1 font-display text-2xl">30 days before a COI lapses</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Dispatch is CLEAR, WATCH, or HOLD. HOLD never goes through the gate or onto the slab. The evidence pack
                is what you hand the owner when they ask who was covered this morning.
              </p>
            </div>
            <div className="bg-bg p-5">
              <div className="text-[11px] uppercase tracking-[0.2em] text-primary">Laytime · terminal</div>
              <h3 className="mt-1 font-display text-2xl">30 days to void a detention invoice</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                OSRA 2022 / 46 CFR 541. Missing required fields make a bill voidable. Same engine: ingest the original,
                confirm the dates, derive the dispute — attach the Holdfast pack if the trucker was HOLD at the gate.
              </p>
            </div>
          </div>
        </section>

        <div className="beam mb-10 mt-8" />

        <section className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {[
            ["12", "subs on the job"],
            ["1", "expired this week"],
            ["$1M", "GL required"],
            ["0", "typed statuses"],
            ["30d", "first alert"],
          ].map(([n, l], i) => (
            <div key={l} className={`rise rise-${i + 1} border border-border bg-surface px-3 py-4`}>
              <div className="font-display text-3xl text-fg tabular-nums">{n}</div>
              <div className="mt-1 text-[11px] uppercase tracking-wider text-muted">{l}</div>
            </div>
          ))}
        </section>

        <section id="why" className="mt-14 scroll-mt-20 grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2">
          <Why
            n="01"
            t="The jobsite still runs on inboxes"
            d="COIs arrive as attachments. They die in email. Spreadsheets go stale the week after bid day. You find out at the claim."
          />
          <Why
            n="02"
            t="A missed date is a coverage gap"
            d="Additional insured, waiver of subrogation, $1M GL — if it expired yesterday, it is not coverage. Holdfast treats that as expired, not 'probably fine.'"
          />
          <Why
            n="03"
            t="We refuse a 'compliant' checkbox"
            d="Status is computed from the original PDF plus your standards every time you look. Change a limit; the board flips."
          />
          <Why
            n="04"
            t="OCR that looks at the page"
            d="Text-layer ACORDs and scanned faxes. We render the page and read it — then a human confirms. Wrong dates never auto-save."
          />
        </section>

        <section className="mt-14 border border-border bg-surface p-5 sm:p-8">
          <p className="text-[11px] uppercase tracking-[0.22em] text-primary">The board, not a spreadsheet</p>
          <h2 className="mt-1 font-display text-3xl sm:text-4xl">Five states. Derived every time you look.</h2>
          <div className="mt-6 grid gap-2 sm:grid-cols-5">
            {(["compliant", "expiring", "expired", "missing", "insufficient"] as const).map((s) => (
              <div key={s} className="tile-hover min-h-24 border border-border bg-bg p-3">
                <StatusChip status={s} />
                <p className="mt-3 text-xs leading-relaxed text-muted">{BOARD[s]}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-12">
          <DemoPlay />
        </div>

        <section id="pricing" className="mt-16 scroll-mt-20">
          <h2 className="font-display text-3xl sm:text-4xl">Plans that follow vendor count</h2>
          <p className="mt-2 max-w-xl text-sm text-muted">
            One axis: how many subs you watch. Seats are not the meter. Design partners start on a trial —
            we do not gate the core board during a paid pilot.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <Plan
              name="Starter"
              price="$49"
              blurb="Most GCs. 25 vendors, 5 teammates, email alerts, CSV/PDF export."
              points={["Derived status board", "Upload + review", "30 / 14 / 7 / 1 day alerts", "Audit log"]}
            />
            <Plan
              name="Growth"
              price="$149"
              blurb="Unlimited vendors and teammates when the job book is no longer a spreadsheet."
              points={["Everything in Starter", "Unlimited subs", "Priority extraction queue", "Soon: per-project standards"]}
              featured
            />
          </div>
          <p className="mt-4 text-xs text-muted">
            Staging preview uses a trial simulator — no live card charges here. Stripe goes live on the
            production stack.
          </p>
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
  featured,
}: {
  name: string;
  price: string;
  blurb: string;
  points: string[];
  featured?: boolean;
}) {
  return (
    <div className={`tile-hover border bg-surface p-6 ${featured ? "border-primary" : "border-border"}`}>
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
      <a href="#demo">
        <Button className="mt-6 min-h-12 w-full" tone={featured ? "primary" : "ghost"}>
          Try before you pay
        </Button>
      </a>
    </div>
  );
}
