import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { bootstrap, listBooks, listDashboard, listVendors } from "@/lib/holdfast/actions";
import { formatDollars, paperMail, paperScript, payMail, payScript } from "@/lib/holdfast/chase";
import { Button, Field, Input } from "@/components/ui-kit";

export const Route = createFileRoute("/app/chase")({ component: Chase });

function Chase() {
  const [desk, setDesk] = useState<"paper" | "pay">("paper");
  const org = useQuery({ queryKey: ["org"], queryFn: () => bootstrap() });
  const board = useQuery({ queryKey: ["dashboard"], queryFn: () => listDashboard() });
  const vendors = useQuery({ queryKey: ["vendors"], queryFn: () => listVendors() });
  const orgName = org.data?.name ?? "the GC";
  const paperDue = (board.data?.vendors ?? []).filter((v) => v.gate !== "clear");

  return (
    <div className="space-y-8">
      <header>
        <p className="text-[11px] uppercase tracking-[0.24em] text-primary">Optional agents</p>
        <h1 className="font-display text-4xl">Chase</h1>
        <p className="mt-1 max-w-xl text-sm text-muted">
          You were going to call anyway. Paper from the COI board. Pay from Books remaining — or type a number. Mail
          and voice draft only. We do not autodial.
        </p>
      </header>

      <div className="flex gap-2">
        <Button tone={desk === "paper" ? "primary" : "ghost"} onClick={() => setDesk("paper")}>
          Paper (COI)
        </Button>
        <Button tone={desk === "pay" ? "primary" : "ghost"} onClick={() => setDesk("pay")}>
          Pay
        </Button>
        <Link to="/app/books">
          <Button tone="ghost">Books</Button>
        </Link>
      </div>

      {desk === "paper" ? (
        paperDue.length === 0 ? (
          <p className="text-sm text-muted">
            Nobody on HOLD or WATCH.{" "}
            <Link to="/app" className="text-primary underline">
              Board
            </Link>
          </p>
        ) : (
          <ul className="space-y-4">
            {paperDue.map((v) => {
              const row = vendors.data?.find((x) => x.id === v.vendorId);
              const script = paperScript({
                orgName,
                vendor: v.vendorName,
                gate: v.gate,
                summary: v.summary,
              });
              const mail = paperMail({ vendor: v.vendorName, script });
              return (
                <ChaseRow
                  key={v.vendorId}
                  name={v.vendorName}
                  tag={v.gate.toUpperCase()}
                  bad={v.gate === "hold"}
                  script={script}
                  phone={row?.phone}
                  email={row?.contact_email}
                  mail={mail}
                />
              );
            })}
          </ul>
        )
      ) : (
        <PayDesk orgName={orgName} />
      )}
    </div>
  );
}

function PayDesk({ orgName }: { orgName: string }) {
  const books = useQuery({ queryKey: ["books"], queryFn: () => listBooks() });
  const board = useQuery({ queryKey: ["dashboard"], queryFn: () => listDashboard() });
  const gateById = new Map((board.data?.vendors ?? []).map((v) => [v.vendorId, v.gate]));
  const rows = books.data ?? [];
  if (books.isLoading) return <p className="text-sm text-muted">Loading books…</p>;
  if (!rows.length) {
    return (
      <p className="text-sm text-muted">
        No subs.{" "}
        <Link to="/app/vendors" className="text-primary underline">
          Add a sub
        </Link>
      </p>
    );
  }
  return (
    <ul className="space-y-4">
      {rows.map((v) => (
        <PayRow
          key={v.id}
          orgName={orgName}
          vendor={{
            name: v.name,
            phone: v.phone,
            email: v.contact_email,
            gate: gateById.get(v.id) ?? "hold",
            remaining: v.remaining,
          }}
        />
      ))}
    </ul>
  );
}

function PayRow({
  orgName,
  vendor,
}: {
  orgName: string;
  vendor: { name: string; phone: string | null; email: string | null; gate: string; remaining: number };
}) {
  const prefill = vendor.remaining > 0 ? String(vendor.remaining / 100) : "";
  const [amount, setAmount] = useState(prefill);
  const [reason, setReason] = useState("open balance on our books");
  const label = formatDollars(amount);
  const script = label
    ? payScript({ orgName, vendor: vendor.name, amountLabel: label, reason })
    : "Type the dollars first. We will not invent a balance.";
  const mail = label ? payMail({ vendor: vendor.name, amountLabel: label, reason, script }) : null;
  return (
    <li className="border border-border bg-surface p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-2xl">{vendor.name}</h2>
        <span className="text-xs uppercase tracking-wider text-muted">coverage {vendor.gate}</span>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Amount they owe you">
          <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="12500" />
        </Field>
        <Field label="Why">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
      </div>
      <ChaseRow
        name={vendor.name}
        tag={label ?? "NO $"}
        bad={false}
        script={script}
        phone={vendor.phone}
        email={vendor.email}
        mail={mail}
        nested
      />
    </li>
  );
}

function ChaseRow({
  name,
  tag,
  bad,
  script,
  phone,
  email,
  mail,
  nested,
}: {
  name: string;
  tag: string;
  bad: boolean;
  script: string;
  phone?: string | null;
  email?: string | null;
  mail: { subject: string; body: string } | null;
  nested?: boolean;
}) {
  const tel = phone ? "tel:" + phone.replace(/[^\d+]/g, "") : null;
  return (
    <div className={nested ? "mt-4" : "border border-border bg-surface p-4"}>
      {nested ? null : (
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-2xl">{name}</h2>
          <span className={bad ? "text-bad" : "text-warn"}>{tag}</span>
        </div>
      )}
      <p className="mt-3 text-sm leading-relaxed text-muted">{script}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {tel ? (
          <a href={tel}>
            <Button className="min-h-11">Voice — call {phone}</Button>
          </a>
        ) : (
          <span className="self-center text-sm text-muted">No phone. Add on Subs.</span>
        )}
        {email && mail ? (
          <a href={`mailto:${email}?subject=${encodeURIComponent(mail.subject)}&body=${encodeURIComponent(mail.body)}`}>
            <Button tone="ghost" className="min-h-11">
              Mail agent
            </Button>
          </a>
        ) : null}
        <Button type="button" tone="ghost" onClick={() => void navigator.clipboard.writeText(script)}>
          Copy
        </Button>
      </div>
    </div>
  );
}
