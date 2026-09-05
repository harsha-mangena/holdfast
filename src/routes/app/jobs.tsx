import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { ingestInvite, listJobs, seedSampleJob } from "@/lib/holdfast/actions";
import { SAMPLE_ITB } from "@/lib/holdfast/precon";
import { BoardError, Button } from "@/components/ui-kit";

export const Route = createFileRoute("/app/jobs")({ component: Jobs });

function Jobs() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["jobs"], queryFn: () => listJobs() });
  const [text, setText] = useState("");
  const ingest = useMutation({
    mutationFn: () => ingestInvite({ data: { text } }),
    onSuccess: () => {
      setText("");
      void qc.invalidateQueries({ queryKey: ["jobs"] });
      void qc.invalidateQueries({ queryKey: ["calendar"] });
    },
  });
  const seed = useMutation({
    mutationFn: () => seedSampleJob(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["jobs"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
      void qc.invalidateQueries({ queryKey: ["calendar"] });
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    ingest.mutate();
  }

  const rows = q.data ?? [];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] uppercase tracking-[0.24em] text-primary">Preconstruction</p>
        <h1 className="font-display text-4xl">Jobs</h1>
        <p className="mt-1 max-w-xl text-sm text-muted">
          Forward an invitation. We pull dates, trades, bond. Bid or no-bid is derived from who is CLEAR on
          those trades today — not a gut call.
        </p>
      </header>

      <form onSubmit={onSubmit} className="border border-border bg-surface p-4">
        <label className="text-[11px] uppercase tracking-wider text-muted">Paste an ITB</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          className="mt-2 w-full rounded-md border border-border bg-raised p-3 text-sm outline-none focus:border-primary"
          placeholder="Invitation to bid, owner, due date, trades…"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="submit" disabled={ingest.isPending || text.trim().length < 12} className="min-h-11">
            {ingest.isPending ? "Reading…" : "Index invitation"}
          </Button>
          <Button type="button" tone="ghost" className="min-h-11" onClick={() => setText(SAMPLE_ITB)}>
            Load sample ITB
          </Button>
        </div>
        <BoardError error={ingest.error} />
      </form>

      {q.isLoading ? <div className="h-32 animate-pulse border border-border bg-raised" /> : null}
      <BoardError error={q.error} />

      {rows.length === 0 && !q.isLoading ? (
        <div className="border border-dashed border-border p-6">
          <p className="font-display text-2xl">No invitations on the board.</p>
          <p className="mt-2 text-sm text-muted">Load the sample jobsite to see Northfork, Iron Ridge, and Pinnacle.</p>
          <Button className="mt-4 min-h-11" onClick={() => seed.mutate()} disabled={seed.isPending}>
            {seed.isPending ? "Loading…" : "Load sample jobsite"}
          </Button>
        </div>
      ) : null}

      <ul className="space-y-3">
        {rows.map((j) => (
          <li key={j.id} className="border border-border bg-surface">
            <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="font-display text-2xl leading-tight">{j.name}</div>
                <p className="text-xs text-muted">
                  {[j.ownerName, j.location].filter(Boolean).join(" · ") || "Owner not on the invite"}
                </p>
              </div>
              <CallBadge call={j.call} />
            </div>
            <p className="border-t border-border px-4 py-2 text-sm text-muted">{j.reason}</p>
            <dl className="grid grid-cols-2 gap-px border-t border-border bg-border text-sm sm:grid-cols-4">
              <Fact k="Bid due" v={j.bidDue ?? "Missing"} />
              <Fact k="Start" v={j.startDate ?? "Missing"} />
              <Fact k="Bond" v={j.bondRequired ? "Required" : "Not stated"} />
              <Fact k="Wage" v={j.prevailingWage ? "Prevailing" : "Not stated"} />
            </dl>
            <div className="flex flex-wrap gap-2 px-4 py-3">
              {j.coverage.map((c) => (
                <span key={c.trade} className="border border-border px-2 py-1 text-[11px] uppercase tracking-wider">
                  {c.trade} · {c.band} · {c.clear} clear / {c.total}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>

      <p className="text-xs text-muted">
        Additional details the invite skipped (start date, bond, wage) stay marked missing until the pack says
        otherwise. <Link to="/app/clerk" className="text-primary underline">Ask the pack</Link>.
      </p>
    </div>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div className="bg-surface px-4 py-3">
      <dt className="text-[10px] uppercase tracking-wider text-muted">{k}</dt>
      <dd className="tabular-nums">{v}</dd>
    </div>
  );
}

function CallBadge({ call }: { call: "bid" | "hold-scope" | "no-bid" }) {
  const label = call === "bid" ? "BID" : call === "no-bid" ? "NO-BID" : "HOLD SCOPE";
  const cls = call === "bid" ? "text-ok" : call === "no-bid" ? "text-bad" : "text-warn";
  return <span className={`font-display text-xl ${cls}`}>{label}</span>;
}
