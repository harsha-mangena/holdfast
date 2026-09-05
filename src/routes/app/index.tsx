import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listBooks, listDashboard, listVendors, seedSampleJob } from "@/lib/holdfast/actions";
import { seedPreconJobs } from "@/lib/holdfast/jobs-fn";
import { tradeCoverage } from "@/lib/holdfast/precon";
import { BoardError, Button, StatusChip } from "@/components/ui-kit";

export const Route = createFileRoute("/app/")({ component: Board });

function money(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function Board() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["dashboard"], queryFn: () => listDashboard() });
  const books = useQuery({ queryKey: ["books"], queryFn: () => listBooks() });
  const vendorList = useQuery({ queryKey: ["vendors"], queryFn: () => listVendors() });
  const seed = useMutation({
    mutationFn: async () => {
      await seedSampleJob();
      await seedPreconJobs();
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
      void qc.invalidateQueries({ queryKey: ["vendors"] });
      void qc.invalidateQueries({ queryKey: ["certs"] });
      void qc.invalidateQueries({ queryKey: ["books"] });
      void qc.invalidateQueries({ queryKey: ["jobs"] });
      void qc.invalidateQueries({ queryKey: ["calendar"] });
    },
  });
  const data = q.data;
  const bookRows = books.data ?? [];
  const openCents = bookRows.reduce((s, r) => s + r.remaining, 0);
  const billedCents = bookRows.reduce((s, r) => s + r.billed, 0);
  const paidCents = bookRows.reduce((s, r) => s + r.paid, 0);
  const hold = data?.vendors.filter((v) => v.gate === "hold") ?? [];
  const watch = data?.vendors.filter((v) => v.gate === "watch") ?? [];
  const clear = data?.vendors.filter((v) => v.gate === "clear") ?? [];
  const trades = tradeCoverage(
    (vendorList.data ?? [])
      .filter((v) => v.active)
      .map((v) => ({
        trade: v.trade,
        gate: data?.vendors.find((x) => x.vendorId === v.id)?.gate ?? "hold",
      })),
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-primary">6 a.m. desk</p>
          <h1 className="font-display text-4xl">Dashboard</h1>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Gate and books on one page. HOLD does not enter. Open dollars feed Chase. The clerk reads both.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/app/chase">
            <Button className="min-h-11">Chase</Button>
          </Link>
          <Link to="/app/clerk">
            <Button tone="ghost" className="min-h-11">
              Clerk
            </Button>
          </Link>
        </div>
      </header>

      {q.isLoading ? <div className="h-28 animate-pulse border border-border bg-raised" /> : null}
      <BoardError error={q.error} />

      {data && data.vendors.length === 0 ? (
        <div className="border border-dashed border-border p-8">
          <p className="font-display text-3xl">Empty dashboard. Dead product.</p>
          <p className="mt-2 max-w-lg text-sm text-muted">
            Load Iron Ridge — expired GL, HOLD at the gate — or add a sub. Do not sit on a blank board.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Button onClick={() => seed.mutate()} disabled={seed.isPending} className="min-h-12">
              {seed.isPending ? "Loading sample…" : "Load sample jobsite"}
            </Button>
            <Link to="/app/vendors">
              <Button tone="ghost" className="min-h-12">
                Add a sub
              </Button>
            </Link>
          </div>
          <BoardError error={seed.error} />
        </div>
      ) : null}

      {data && data.vendors.length > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
            <Kpi label="HOLD" value={String(hold.length)} tone={hold.length ? "bad" : "ok"} />
            <Kpi label="WATCH" value={String(watch.length)} tone={watch.length ? "warn" : "muted"} />
            <Kpi label="CLEAR" value={String(clear.length)} tone="ok"} />
            <Kpi label="Open" value={money(openCents)} tone={openCents > 0 ? "warn" : "ok"} />
            <Kpi label="Billed" value={money(billedCents)} tone="muted"} />
          </div>

          <p className="font-display text-2xl">
            {hold.length
              ? `${hold.length} cannot enter the job today.`
              : watch.length
                ? `${watch.length} on the 30-day clock. The fence is otherwise open.`
                : `${clear.length} clear. The gate is open.`}
            {openCents > 0 ? ` ${money(openCents)} still open on the books.` : ""}
          </p>

          {trades.length ? (
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-display text-2xl">Coverage by trade</h2>
                <Link to="/app/jobs" className="text-xs text-primary underline">
                  Jobs
                </Link>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {trades.map((t) => (
                  <div key={t.trade} className="border border-border bg-surface p-3">
                    <div className="text-[10px] uppercase tracking-wider text-muted">{t.band} coverage</div>
                    <div className="font-display text-xl">{t.trade}</div>
                    <div className="text-xs text-muted">
                      {t.clear} CLEAR · {t.hold} HOLD · {t.watch} WATCH
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="border border-border bg-surface">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <h2 className="font-display text-2xl">Gate</h2>
                <Link to="/app/certificates" className="text-xs text-primary underline">
                  Certs
                </Link>
              </div>
              <ul>
                {data.vendors.map((v) => (
                  <li key={v.vendorId} className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-0">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{v.vendorName}</div>
                      <div className="truncate text-xs text-muted">{v.summary}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {v.clockDays != null ? (
                        <span className="text-xs tabular-nums text-muted">
                          {v.clockDays < 0 ? Math.abs(v.clockDays) + "d past" : v.clockDays + "d"}
                        </span>
                      ) : null}
                      <span
                        className={
                          v.gate === "hold" ? "font-display text-xl text-bad" : v.gate === "watch" ? "font-display text-xl text-warn" : "font-display text-xl text-ok"
                        }
                      >
                        {v.gate.toUpperCase()}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="border border-border bg-surface">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <h2 className="font-display text-2xl">Finance</h2>
                <Link to="/app/books" className="text-xs text-primary underline">
                  Post a line
                </Link>
              </div>
              {bookRows.length === 0 || billedCents + paidCents === 0 ? (
                <p className="px-4 py-6 text-sm text-muted">
                  No invoices yet. Post a pay app on Finance. Remaining will show here and prefill Chase.
                </p>
              ) : (
                <ul className="space-y-3 p-4">
                  <li className="flex justify-between text-sm text-muted">
                    <span>Paid {money(paidCents)}</span>
                    <span>Open {money(openCents)}</span>
                  </li>
                  {bookRows.map((r) => (
                    <li key={r.id}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span>{r.name}</span>
                        <span className={r.remaining > 0 ? "text-warn" : "text-muted"}>{money(r.remaining)}</span>
                      </div>
                      <div className="h-2 bg-raised">
                        <div
                          className="fin-bar h-2"
                          style={{ width: `${Math.min(100, (r.billed / Math.max(billedCents, 1)) * 100)}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {data.alerts.length > 0 ? (
            <section className="border border-bad/40 bg-surface p-4">
              <h2 className="font-display text-xl text-bad">Would email today</h2>
              <p className="text-xs text-muted">SMTP is not live in this preview.</p>
              <ul className="mt-3 space-y-2">
                {data.alerts.map((a) => (
                  <li key={a.vendor} className="flex flex-wrap items-center gap-2 text-sm">
                    <StatusChip status={a.status} />
                    <span>{a.vendor}</span>
                    <span className="text-muted">{a.summary}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone: "ok" | "warn" | "bad" | "muted" }) {
  const color = tone === "ok" ? "text-ok" : tone === "warn" ? "text-warn" : tone === "bad" ? "text-bad" : "text-fg";
  return (
    <div className="border border-border bg-surface p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted">{label}</div>
      <div className={`font-display text-3xl tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
