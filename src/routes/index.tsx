import { createFileRoute, Link } from "@tanstack/react-router";
import { SignedIn, SignedOut } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button } from "@/components/ui-kit";
import { ThemeToggle } from "@/components/theme-toggle";
import { ProductWindow } from "@/components/product-window";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { isPending } = useCurrentUserState();
  return (
    <div className="min-h-dvh overflow-x-hidden bg-bg text-fg">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <a href="#top" className="font-display text-2xl tracking-wide text-primary">
            Holdfast
          </a>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
            <a href="#product">Product</a>
            <a href="#how">How it works</a>
            <Link to="/live">Live job</Link>
            <a href="#pricing">Get a demo</a>
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
              <Button className="min-h-10 rounded-full px-5">Get a demo</Button>
            </Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main id="top">
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 lg:grid-cols-2 lg:py-16">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-primary">The 6 a.m. gate</p>
            <h1 className="mt-3 font-serif text-[clamp(2.4rem,6vw,4.4rem)] font-medium leading-[1.05] tracking-tight">
              Expired certificates of insurance do not go through the fence.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              HOLD, WATCH, or CLEAR — derived from the PDF and your standards, sitting next to the dollars still open
              on that crew. Jones files. We gate the job.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/demo">
                <Button className="min-h-12 w-full rounded-full sm:w-auto">See it run — no account</Button>
              </Link>
              <Link to="/live">
                <Button tone="ghost" className="min-h-12 w-full rounded-full sm:w-auto">
                  Open the live board
                </Button>
              </Link>
            </div>
          </div>
          <ProductWindow />
        </section>

        <section className="border-y border-border bg-surface">
          <div className="mx-auto grid max-w-6xl gap-px sm:grid-cols-3">
            {[
              ["$12,500", "held on Iron Ridge pay app 14"],
              ["NCCI 2-H", "uninsured payroll becomes yours"],
              ["$49", "25 names. Human confirm."],
            ].map(([n, l]) => (
              <div key={n} className="bg-surface px-6 py-8">
                <div className="font-serif text-3xl">{n}</div>
                <p className="mt-1 text-sm text-muted">{l}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
          <p className="text-[11px] uppercase tracking-[0.22em] text-primary">How it works</p>
          <h2 className="mt-1 font-serif text-3xl sm:text-4xl">Three lines. Not four identical screenshots.</h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              ["01", "Drop", "Sub never logs in. The PDF lands. OCR is a draft."],
              ["02", "Confirm", "A human stamps the date. The model cannot CLEAR."],
              ["03", "Gate", "HOLD does not enter. Remaining dollars freeze on the same row."],
            ].map(([n, t, d]) => (
              <li key={n}>
                <div className="text-[11px] uppercase tracking-wider text-primary">{n}</div>
                <h3 className="mt-1 font-serif text-2xl">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{d}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="product" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-8">
          <p className="text-[11px] uppercase tracking-[0.22em] text-primary">Also on the desk</p>
          <h2 className="mt-1 font-serif text-3xl sm:text-4xl">Preconstruction without a second product.</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <Feature t="Jobs" d="Forward any invitation. We index dates, trades, bond, wage. Bid / no-bid is derived from who is CLEAR in those trades today." />
            <Feature t="Coverage by trade" d="Low, medium, or high at the division — the GC version of bid coverage. Thin HVAC is a HOLD scope, not a surprise on Monday." />
            <Feature t="Calendar" d="Bid due, NTP, COI expiries, pay apps. One week the whole estimating desk can read." />
            <Feature t="Ask the pack" d="Who is HOLD. Which trade is thin. What the invite skipped. Grounded in this board, not a chatbot." />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14">
          <p className="text-[11px] uppercase tracking-[0.22em] text-primary">Stories</p>
          <h2 className="mt-1 font-serif text-3xl">The live sample. We do not have paying GCs yet.</h2>
          <article className="mt-6 border border-border bg-surface p-6 sm:p-8">
            <p className="font-serif text-4xl tabular-nums">$12,500 held</p>
            <p className="mt-2 max-w-2xl text-muted">
              Northfork job 14. Iron Ridge Electric, 246 days past on GL. Super wants the lot closed. Controller wants
              the check frozen. Same row.
            </p>
          </article>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Quote n="The date" d="A COI is a snapshot. Policies cancel after the PDF. GCs still get named." />
            <Quote n="The drop" d="Sub never logs in. Billy sells that. We tie it to pay." />
            <Quote n="NCCI 2-H" d="Pay an uninsured sub and those dollars become your workers-comp payroll." />
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-24">
          <h2 className="font-serif text-3xl sm:text-4xl">One plan. Twenty-five names.</h2>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Seats are not the meter. $49 watches 25 subs — drop link, jobs, calendar, books, chase.
          </p>
          <div className="mt-8 max-w-md">
            <Plan
              name="Founding"
              price="$49"
              blurb="Most GCs. 25 names on the board."
              points={[
                "Derived HOLD / WATCH / CLEAR",
                "Human confirm",
                "Jobs, trade coverage, calendar",
                "Books + chase",
                "Ask the pack",
              ]}
              featured
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

function Feature({ t, d }: { t: string; d: string }) {
  return (
    <div className="border border-border bg-surface p-5">
      <h3 className="font-serif text-2xl">{t}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{d}</p>
    </div>
  );
}

function Quote({ n, d }: { n: string; d: string }) {
  return (
    <div className="border border-border bg-surface p-5">
      <div className="text-[11px] uppercase tracking-wider text-primary">{n}</div>
      <p className="mt-2 text-sm text-muted">{d}</p>
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
    <div className={`border bg-surface p-6 ${featured ? "border-primary" : "border-border"}`}>
      <div className="font-serif text-2xl">{name}</div>
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
        <Button className="mt-6 min-h-12 w-full rounded-full">{featured ? "Start founding" : "See it run"}</Button>
      </Link>
    </div>
  );
}
