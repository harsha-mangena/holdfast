import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { listVendors, saveVendor, seedSampleJob } from "@/lib/holdfast/actions";
import { BoardError, Button, Field, Input } from "@/components/ui-kit";

export const Route = createFileRoute("/app/vendors")({ component: Vendors });

function Vendors() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["vendors"], queryFn: () => listVendors() });
  const [name, setName] = useState("");
  const [trade, setTrade] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
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

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    save.mutate();
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-4xl">Subs</h1>
        <p className="text-sm text-muted">The people who must carry paper.</p>
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
        {save.error ? <p className="md:col-span-5"><BoardError error={save.error} /></p> : null}
      </form>
      <Button type="button" tone="ghost" onClick={() => sample.mutate()} disabled={sample.isPending}>
        Load sample jobsite (expired GL)
      </Button>
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
