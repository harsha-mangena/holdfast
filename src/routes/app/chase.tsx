import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { bootstrap, listBooks, listDashboard, listVendors, placeChaseCall } from "@/lib/holdfast/actions";
import { formatDollars, paperMail, paperScript, payMail, payScript } from "@/lib/holdfast/chase";
import type { VendorResult } from "@/lib/holdfast/compliance";
import { BoardError, Button, ButtonLink, Field, Input } from "@/components/ui-kit";
import { CallBooth } from "@/components/call-booth";

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
          Open a sub to see why they cannot enter and what we will say. Sample 555 numbers stay in this window.
        </p>
      </header>

      <div className="flex gap-2">
        <Button tone={desk === "paper" ? "primary" : "ghost"} onClick={() => setDesk("paper")}>
          Paper (COI)
        </Button>
        <Button tone={desk === "pay" ? "primary" : "ghost"} onClick={() => setDesk("pay")}>
          Pay
        </Button>
        <ButtonLink tone="ghost" href="/app/books">
          Books
        </ButtonLink>
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
          <ul className="space-y-2">
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
                  vendor={v}
                  trade={row?.trade}
                  phone={row?.phone}
                  email={row?.contact_email}
                  script={script}
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
  const vendors = useQuery({ queryKey: ["vendors"], queryFn: () => listVendors() });
  const scored = new Map((board.data?.vendors ?? []).map((v) => [v.vendorId, v]));
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
    <ul className="space-y-2">
      {rows.map((v) => {
        const s = scored.get(v.id);
        return (
          <PayRow
            key={v.id}
            orgName={orgName}
            vendor={{
              id: v.id,
              name: v.name,
              phone: v.phone,
              email: v.contact_email,
              remaining: v.remaining,
              scored: s,
            }}
          />
        );
      })}
    </ul>
  );
}

function PayRow({
  orgName,
  vendor,
}: {
  orgName: string;
  vendor: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    remaining: number;
    scored?: VendorResult;
  };
}) {
  const prefill = vendor.remaining > 0 ? String(vendor.remaining / 100) : "";
  const [amount, setAmount] = useState(prefill);
  const [reason, setReason] = useState("open balance on our books");
  const [open, setOpen] = useState(false);
  const label = formatDollars(amount);
  const script = label
    ? payScript({ orgName, vendor: vendor.name, amountLabel: label, reason })
    : "Type the dollars first. We will not invent a balance.";
  const mail = label ? payMail({ vendor: vendor.name, amountLabel: label, reason, script }) : null;
  return (
    <li className="border border-border bg-surface">
      <button type="button" className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left" onClick={() => setOpen((v) => !v)}>
        <span>
          <span className="block font-display text-2xl">{vendor.name}</span>
          <span className="text-sm text-muted">{label ? `${label} open` : "No amount yet"}</span>
        </span>
        <span className="text-xs uppercase tracking-wider text-muted">{open ? "Close" : "Open"}</span>
      </button>
      {open ? (
        <div className="border-t border-border px-4 pb-4 pt-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Amount they owe you">
              <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="12500" />
            </Field>
            <Field label="Why">
              <Input value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
          </div>
          <Actions name={vendor.name} script={script} phone={vendor.phone} email={vendor.email} mail={mail} />
        </div>
      ) : null}
    </li>
  );
}

function ChaseRow({
  vendor,
  trade,
  phone,
  email,
  script,
  mail,
}: {
  vendor: VendorResult;
  trade?: string | null;
  phone?: string | null;
  email?: string | null;
  script: string;
  mail: { subject: string; body: string } | null;
}) {
  const [open, setOpen] = useState(false);
  const bad = vendor.gate === "hold";
  const headline = vendor.lines.find((l) => l.status !== "compliant")?.explanation ?? vendor.summary;
  return (
    <li className="border border-border bg-surface">
      <button type="button" className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-raised" onClick={() => setOpen((v) => !v)}>
        <span className="min-w-0">
          <span className="block font-display text-2xl">{vendor.vendorName}</span>
          <span className="mt-0.5 block truncate text-sm text-muted">{headline}</span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <span className={bad ? "font-display text-xl text-bad" : "font-display text-xl text-warn"}>{vendor.gate.toUpperCase()}</span>
          <span className="text-[10px] uppercase tracking-wider text-muted">{open ? "Close" : "Details"}</span>
        </span>
      </button>
      {open ? (
        <div className="space-y-4 border-t border-border px-4 py-4">
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[10px] uppercase tracking-wider text-muted">Trade</dt>
              <dd>{trade || "Unset"}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-wider text-muted">Clock</dt>
              <dd>
                {vendor.clockDays == null
                  ? "No date on file"
                  : vendor.clockDays < 0
                    ? Math.abs(vendor.clockDays) + " days past"
                    : vendor.clockDays + " days left"}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-wider text-muted">Phone</dt>
              <dd>{phone || "Add on Subs"}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-wider text-muted">Email</dt>
              <dd className="break-all">{email || "Add on Subs"}</dd>
            </div>
          </dl>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted">Coverage</p>
            <ul className="mt-1 space-y-1 text-sm">
              {vendor.lines.map((l) => (
                <li key={l.coverageType} className={l.status === "compliant" ? "text-muted" : l.status === "expired" || l.status === "missing" ? "text-bad" : "text-warn"}>
                  {l.explanation}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted">What we say</p>
            <p className="mt-1 text-sm leading-relaxed">{script}</p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link to="/app/certificates" className="text-primary underline">
              Certificate
            </Link>
            <Link to="/app/vendors" className="text-primary underline">
              Sub record
            </Link>
          </div>
          <Actions name={vendor.vendorName} script={script} phone={phone} email={email} mail={mail} />
        </div>
      ) : null}
    </li>
  );
}

function Actions({
  name,
  script,
  phone,
  email,
  mail,
}: {
  name: string;
  script: string;
  phone?: string | null;
  email?: string | null;
  mail: { subject: string; body: string } | null;
}) {
  const [booth, setBooth] = useState(false);
  const call = useMutation({
    mutationFn: () => placeChaseCall({ data: { phone: phone ?? "", script, vendor: name } }),
  });
  const tel = phone ? "tel:" + phone.replace(/[^\d+]/g, "") : null;
  function start() {
    if (!phone || !script || script.startsWith("Type the dollars")) return;
    setBooth(true);
    call.mutate();
  }
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {phone ? (
          <Button className="min-h-11" onClick={start} disabled={call.isPending}>
            Call {phone}
          </Button>
        ) : (
          <span className="self-center text-sm text-muted">No phone. Add on Subs.</span>
        )}
        {email && mail ? (
          <ButtonLink
            tone="ghost"
            href={`mailto:${email}?subject=${encodeURIComponent(mail.subject)}&body=${encodeURIComponent(mail.body)}`}
          >
            Open mail
          </ButtonLink>
        ) : null}
        <Button type="button" tone="ghost" onClick={() => void navigator.clipboard.writeText(script)}>
          Copy
        </Button>
        {tel ? (
          <ButtonLink tone="ghost" href={tel}>
            Device dialer
          </ButtonLink>
        ) : null}
      </div>
      <BoardError error={call.error} />
      {booth && phone ? (
        <CallBooth
          name={name}
          phone={phone}
          script={script}
          status={call.data?.detail ?? (call.isPending ? "Connecting…" : "Speaking.")}
          error={call.error}
          onHang={() => {
            window.speechSynthesis?.cancel();
            setBooth(false);
          }}
        />
      ) : null}
    </div>
  );
}
