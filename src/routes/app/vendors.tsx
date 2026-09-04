import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { importVendors, listVendors, saveVendor, seedSampleJob } from "@/lib/holdfast/actions";
import { parseSubFile, SUB_TEMPLATE } from "@/lib/holdfast/parse-subs";
import { BoardError, Button, Field, Input } from "@/components/ui-kit";

export const Route = createFileRoute("/app/vendors")({ component: Vendors });

function Vendors() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["vendors"], queryFn: () => listVendors() });
  const [name, setName] = useState("");
  const [trade, setTrade] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [sheetNote, setSheetNote] = useState("");
  const save = useMutation({
    mutationFn: () => saveVendor({ data: { name, trade, contactEmail: email, phone } }),
    onSuccess: () => {
      setName("");
      setTrade("");
      setEmail("");
      setPhone("");
      void qc.invalidateQueries({ queryKey: ["vendors"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
  const sample = useMutation({
    mutationFn: () => seedSampleJob(),
    onSuccess: () => {
      void qc.invalidateQueries();
    },
  });
  const sheet = useMutation({
    mutationFn: async (file: File) => {
      const rows = await parseSubFile(file);
      if (!rows.length) throw new Error("No company names in that file. First column should be company.");
      return importVendors({ data: { rows } });
    },
    onSuccess: (res) => {
      setSheetNote(
        res.created
          ? `Added ${res.created} sub${res.created === 1 ? "" : "s"}${res.skipped ? ` · skipped ${res.skipped} already on the board` : ""}.`
          : `Nothing new. ${res.skipped} already on the board.`,
      );
      void qc.invalidateQueries({ queryKey: ["vendors"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    save.mutate();
  }

  function template() {
    const blob = new Blob([SUB_TEMPLATE], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "holdfast-subs.csv";
    a.click();
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-4xl">Subs</h1>
        <p className="text-sm text-muted">The people who must carry paper. One at a time, or a spreadsheet.</p>
      </header>
      <form onSubmit={onSubmit} className="grid gap-3 border border-border bg-surface p-4 md:grid-cols-5">
        <Field label="Company">
          <Input required value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Trade">
          <Input value={trade} onChange={(e) => setTrade(e.target.value)} placeholder="Electrical" />
        </Field>
        <Field label="Contact email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Phone">
          <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="555-0100" />
        </Field>
        <div className="flex items-end gap-2">
          <Button type="submit" disabled={save.isPending} className="w-full">
            Add sub
          </Button>
        </div>
        {save.error ? (
          <p className="md:col-span-5">
            <BoardError error={save.error} />
          </p>
        ) : null}
      </form>

      <section className="border border-border bg-surface p-4">
        <h2 className="font-display text-2xl">From a spreadsheet</h2>
        <p className="mt-1 text-sm text-muted">
          CSV or Excel. First row is headers: company, trade, email, phone. Names already on the board are skipped.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <label className="inline-flex min-h-11 cursor-pointer items-center rounded-md border border-border bg-raised px-4 text-sm hover:bg-surface">
            {sheet.isPending ? "Reading…" : "Upload CSV or Excel"}
            <input
              type="file"
              accept=".csv,.tsv,.txt,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="sr-only"
              disabled={sheet.isPending}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) sheet.mutate(f);
              }}
            />
          </label>
          <Button type="button" tone="ghost" onClick={template}>
            Download template
          </Button>
          <a href="/holdfast-subs-120.csv" download className="inline-flex min-h-11 items-center rounded-md border border-border px-4 text-sm hover:bg-raised">
            Download 130 sample subs
          </a>
          <Button type="button" tone="ghost" onClick={() => sample.mutate()} disabled={sample.isPending}>
            Load sample jobsite
          </Button>
        </div>
        {sheetNote ? <p className="mt-3 text-sm text-ok">{sheetNote}</p> : null}
        <BoardError error={sheet.error} />
      </section>

      <ul className="divide-y divide-border border border-border">
        {q.data?.map((v) => (
          <li key={v.id} className="flex items-center justify-between bg-surface px-4 py-3">
            <div>
              <div className="font-medium">{v.name}</div>
              <div className="text-xs text-muted">
                {v.trade || "Trade unset"}
                {v.contact_email ? " · " + v.contact_email : ""}
                {v.phone ? " · " + v.phone : ""}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {v.contact_email ? (
                <a
                  className="text-sm text-muted underline"
                  href={`mailto:${v.contact_email}?subject=${encodeURIComponent("COI required — " + v.name)}&body=${encodeURIComponent(
                    `Need a current ACORD 25 for ${v.name}.\n\nReply with the PDF. We derive status from the certificate — a screenshot is not enough.\n\nRequired: GL $1M occ / $2M agg, additional insured, waiver of subrogation, workers' comp statutory.`,
                  )}`}
                >
                  Ask for COI
                </a>
              ) : null}
              <Link to="/app/certificates" className="text-sm text-primary">
                Upload COI
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
