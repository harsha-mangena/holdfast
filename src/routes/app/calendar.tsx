import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listCalendar } from "@/lib/holdfast/jobs-fn";
import { BoardError } from "@/components/ui-kit";

export const Route = createFileRoute("/app/calendar")({ component: CalendarPage });

function CalendarPage() {
  const q = useQuery({ queryKey: ["calendar"], queryFn: () => listCalendar() });
  const events = q.data ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter((e) => e.date >= today);
  const past = events.filter((e) => e.date < today);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] uppercase tracking-[0.24em] text-primary">Estimating calendar</p>
        <h1 className="font-display text-4xl">Dates</h1>
        <p className="mt-1 max-w-xl text-sm text-muted">
          Built from invitations, COI expirations, and pay apps. The whole desk reads the same week.
        </p>
      </header>

      {q.isLoading ? <div className="h-32 animate-pulse border border-border bg-raised" /> : null}
      <BoardError error={q.error} />

      {events.length === 0 && !q.isLoading ? (
        <p className="border border-dashed border-border p-6 text-sm text-muted">
          No dates yet. Index an invitation on <Link to="/app/jobs" className="text-primary underline">Jobs</Link> or
          confirm a certificate.
        </p>
      ) : null}

      {upcoming.length ? (
        <section>
          <h2 className="font-display text-2xl">Coming</h2>
          <ol className="mt-2 divide-y divide-border border border-border bg-surface">
            {upcoming.map((e) => (
              <EventRow key={e.id} date={e.date} title={e.title} detail={e.detail} tone={e.tone} kind={e.kind} />
            ))}
          </ol>
        </section>
      ) : null}

      {past.length ? (
        <section>
          <h2 className="font-display text-2xl">Passed</h2>
          <ol className="mt-2 divide-y divide-border border border-border bg-surface">
            {past.map((e) => (
              <EventRow key={e.id} date={e.date} title={e.title} detail={e.detail} tone={e.tone} kind={e.kind} />
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}

function EventRow({
  date,
  title,
  detail,
  tone,
  kind,
}: {
  date: string;
  title: string;
  detail: string;
  tone: "ok" | "warn" | "bad" | "muted";
  kind: string;
}) {
  const color = tone === "ok" ? "text-ok" : tone === "warn" ? "text-warn" : tone === "bad" ? "text-bad" : "text-muted";
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3">
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-xs uppercase tracking-wider text-muted">{kind}</div>
      </div>
      <div className={`text-right text-sm tabular-nums ${color}`}>
        <div>{date}</div>
        <div className="text-xs">{detail}</div>
      </div>
    </li>
  );
}
