import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { extractPayLive, listBooks, postPayLine } from "@/lib/holdfast/actions";
import { BoardError, Button, Field, Input } from "@/components/ui-kit";

export const Route = createFileRoute("/app/books")({ component: Books });

function money(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function Books() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["books"], queryFn: () => listBooks() });
  const [vendorId, setVendorId] = useState("");
  const [kind, setKind] = useState<"invoice" | "payment">("invoice");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [note, setNote] = useState("");

  const post = useMutation({
    mutationFn: () => {
      const n = Number(amount.replace(/[$,]/g, ""));
      if (!Number.isFinite(n) || n <= 0) throw new Error("Amount required");
      return postPayLine({
        data: { vendorId, kind, amountCents: Math.round(n * 100), memo },
      });
    },
    onSuccess: () => {
      setAmount("");
      setMemo("");
      setNote("Posted. Remaining is billed minus paid.");
      void qc.invalidateQueries({ queryKey: ["books"] });
    },
  });

  const readPdf = useMutation({
    mutationFn: async (file: File) => {
      const { pdfToEvidence } = await import("@/lib/holdfast/pdf-text");
      const evidence = await pdfToEvidence(await file.arrayBuffer());
      return extractPayLive({ data: { text: evidence.text, images: evidence.images } });
    },
    onSuccess: (d) => {
      if (d.kind) setKind(d.kind);
      if (d.amountCents) setAmount(String(d.amountCents / 100));
      if (d.memo) setMemo(d.memo);
      setNote("Draft from " + d.extractor + ". Confirm the dollars, then post. The agent does not post itself.");
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    post.mutate();
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-[11px] uppercase tracking-[0.24em] text-primary">Reconciliation agent</p>
        <h1 className="font-display text-4xl">Books</h1>
        <p className="mt-1 max-w-xl text-sm text-muted">
          Not QuickBooks. A sub-level running balance: invoices you say they billed, payments you say you made.
          Remaining feeds Chase. The agent reads a pay app. You still post.
        </p>
      </header>

      <form onSubmit={onSubmit} className="space-y-3 border border-border bg-surface p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Sub">
            <select
              className="min-h-11 w-full rounded-md border border-border bg-raised px-3 text-sm"
              required
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
            >
              <option value="">Select…</option>
              {q.data?.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Kind">
            <select
              className="min-h-11 w-full rounded-md border border-border bg-raised px-3 text-sm"
              value={kind}
              onChange={(e) => setKind(e.target.value as "invoice" | "payment")}
            >
              <option value="invoice">Invoice / pay app (they billed you)</option>
              <option value="payment">Payment (you paid them)</option>
            </select>
          </Field>
          <Field label="Amount">
            <Input inputMode="decimal" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="12500" />
          </Field>
          <Field label="Memo">
            <Input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="Retainage job 14" />
          </Field>
        </div>
        <label className="flex min-h-14 cursor-pointer items-center justify-center border border-dashed border-border text-sm text-muted">
          {readPdf.isPending ? "Reading pay app…" : "Optional: drop invoice / pay app / stub (agent drafts, you post)"}
          <input
            type="file"
            accept="application/pdf"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) readPdf.mutate(f);
            }}
          />
        </label>
        <Button type="submit" disabled={post.isPending} className="min-h-12">
          Post to the book
        </Button>
        <BoardError error={post.error} />
        <BoardError error={readPdf.error} />
        {note ? <p className="text-sm text-ok">{note}</p> : null}
      </form>

      <ul className="space-y-3">
        {q.data?.map((v) => (
          <li key={v.id} className="border border-border bg-surface p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-2xl">{v.name}</h2>
              <span className={v.remaining > 0 ? "text-warn" : "text-ok"}>{money(v.remaining)} open</span>
            </div>
            <p className="text-xs text-muted">
              Billed {money(v.billed)} · Paid {money(v.paid)}
              {v.remaining > 0 ? (
                <>
                  {" · "}
                  <Link to="/app/chase" className="text-primary underline">
                    Chase this
                  </Link>
                </>
              ) : null}
            </p>
            {v.lines.length ? (
              <ul className="mt-3 space-y-1 text-sm">
                {v.lines.map((l) => (
                  <li key={l.id} className="flex justify-between gap-3 text-muted">
                    <span>
                      {l.kind} {l.memo ? "· " + l.memo : ""}
                    </span>
                    <span className="tabular-nums">
                      {l.kind === "payment" ? "−" : "+"}
                      {money(l.amount_cents)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted">No lines. The agent has nothing to reconcile yet.</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
