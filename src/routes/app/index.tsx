import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listDashboard, seedSampleJob } from "@/lib/holdfast/actions";
import { Button, StatusChip } from "@/components/ui-kit";

export const Route = createFileRoute("/app/")({ component: Board });

function Board() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["dashboard"], queryFn: () => listDashboard() });
  const seed = useMutation({
    mutationFn: () => seedSampleJob(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
      void qc.invalidateQueries({ queryKey: ["vendors"] });
      void qc.invalidateQueries({ queryKey: ["certs"] });
    },
  });
  const data = q.data;
  return (
    <div className="space-y-8">
      <header>
        <p className="text-[11px] uppercase tracking-[0.24em] text-primary">Live derived status</p>
        <h1 className="font-display text-4xl">The board</h1>
        <p className="mt-1 text-sm text-muted">
          Derived status drives the gate. CLEAR goes to the job. HOLD does not. Same kernel as a voidable invoice:
          the original document is the only evidence.
        </p>
      </header>
      {q.isLoading ? (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          {["compliant", "expiring", "expired", "missing", "insufficient"].map((k) => (
            <div key={k} className="min-h-24 animate-pulse border border-border bg-raised p-4">
              <div className="text-[11px] uppercase tracking-wider text-muted">{k}</div>
            </div>
          ))}
        </div>
      ) : null}
      {q.error ? <p className="text-bad">{q.error instanceof Error ? q.error.message : "Failed"}</p> : null}
      {data ? (
        <>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
            {Object.entries(data.counts).map(([k, v]) => (
              <div key={k} className="border border-border bg-surface p-4">
                <div className="text-[11px] uppercase tracking-wider text-muted">{k}</div>
                <div className="font-display text-3xl">{v}</div>
              </div>
            ))}
          </div>
          {(() => {
            const hold = data.vendors.filter((v) => v.gate === "hold").length;
            const watch = data.vendors.filter((v) => v.gate === "watch").length;
            if (!data.vendors.length) return null;
            return (
              <section className="border border-border bg-surface p-4">
                <p className="font-display text-2xl">
                  {hold === 0
                    ? watch
                      ? `${watch} on the 30-day clock. Everyone else may enter.`
                      : `${data.vendors.length} clear. The gate is open.`
                    : `${hold} cannot enter the job today.`}
                </p>
                <p className="mt-1 text-sm text-muted">Superintendent question: who goes through the fence at 6am.</p>
              </section>
            );
          })()}
          {data.alerts.length > 0 ? (
            <section className="border border-bad/40 bg-surface p-4">
              <h2 className="font-display text-xl text-bad">Would email today</h2>
              <p className="text-xs text-muted">SMTP is not live in this staging preview. Production worker sends these.</p>
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
          <section className="space-y-2">
            {data.vendors.length === 0 ? (
              <div className="border border-dashed border-border p-8">
                <p className="font-display text-3xl">The board is empty. That is a dead product.</p>
                <p className="mt-2 max-w-lg text-sm text-muted">
                  Load the Iron Ridge sample — expired GL, HOLD at the gate — or add a real sub. Do not sit on a blank
                  dashboard.
                </p>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <Button onClick={() => seed.mutate()} disabled={seed.isPending} className="min-h-12">
                    {seed.isPending ? "Loading sample…" : "Load sample jobsite (expired GL)"}
                  </Button>
                  <Link to="/app/vendors">
                    <Button tone="ghost" className="min-h-12 w-full sm:w-auto">
                      Add a sub
                    </Button>
                  </Link>
                </div>
                {seed.error ? <p className="mt-3 text-sm text-bad">{seed.error.message}</p> : null}
              </div>
            ) : (
              data.vendors.map((v) => (
                <Link
                  key={v.vendorId}
                  to="/app/vendors"
                  className="flex flex-wrap items-center justify-between gap-3 border border-border bg-surface px-4 py-3 hover:bg-raised"
                >
                  <div>
                    <div className="font-medium">{v.vendorName}</div>
                    <div className="text-sm text-muted">{v.summary}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded-sm border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                        v.gate === "clear"
                          ? "border-ok/40 text-ok"
                          : v.gate === "watch"
                            ? "border-warn/40 text-warn"
                            : "border-bad/40 text-bad"
                      }`}
                    >
                      {v.gate === "clear" ? "Dispatch clear" : v.gate === "watch" ? "Dispatch watch" : "Dispatch hold"}
                    </span>
                    {v.clockDays != null ? (
                      <span className="text-xs tabular-nums text-muted">
                        {v.clockDays < 0 ? Math.abs(v.clockDays) + "d past" : v.clockDays + "d on clock"}
                      </span>
                    ) : (
                      <span className="text-xs text-muted">no date</span>
                    )}
                    <StatusChip status={v.status} />
                  </div>
                </Link>
              ))
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
