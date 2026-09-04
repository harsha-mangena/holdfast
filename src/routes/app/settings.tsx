import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { bootstrap, carrierStatus, deleteAllData, evidencePack, exportCsv, listAudit, saveCarrier, startTrial } from "@/lib/holdfast/actions";
import { BoardError, Button, Field, Input } from "@/components/ui-kit";

export const Route = createFileRoute("/app/settings")({ component: Settings });

function Settings() {
  const qc = useQueryClient();
  const org = useQuery({ queryKey: ["org"], queryFn: () => bootstrap() });
  const carrier = useQuery({ queryKey: ["carrier"], queryFn: () => carrierStatus() });
  const [sid, setSid] = useState("");
  const [token, setToken] = useState("");
  const [from, setFrom] = useState("");
  const saveKeys = useMutation({
    mutationFn: () => saveCarrier({ data: { sid, token, from } }),
    onSuccess: () => {
      setToken("");
      void qc.invalidateQueries({ queryKey: ["carrier"] });
    },
  });
  const audit = useQuery({ queryKey: ["audit"], queryFn: () => listAudit() });
  const [confirm, setConfirm] = useState("");
  const trial = useMutation({
    mutationFn: () => startTrial(),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["org"] }),
  });
  const pack = useMutation({
    mutationFn: () => evidencePack(),
    onSuccess: (res) => {
      const blob = new Blob([JSON.stringify(res, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "holdfast-evidence-pack.json";
      a.click();
    },
  });
  const exp = useMutation({
    mutationFn: () => exportCsv(),
    onSuccess: (res) => {
      const blob = new Blob([res.csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "holdfast-compliance.csv";
      a.click();
    },
  });
  const wipe = useMutation({
    mutationFn: () => deleteAllData({ data: { confirm } }),
    onSuccess: () => {
      void qc.invalidateQueries();
      setConfirm("");
    },
  });

  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-display text-4xl">Office</h1>
        <p className="text-sm text-muted">Billing simulator, export, audit, right to delete.</p>
      </header>
      <section className="border border-border bg-surface p-4">
        <h2 className="font-display text-2xl">Plan</h2>
        <p className="mt-1 text-sm text-muted">
          {org.data?.plan} · {org.data?.billing_status}. Live Stripe is not connected in this staging preview.
          Starting a trial flips local status only — no card is charged.
        </p>
        <Button className="mt-3" onClick={() => trial.mutate()} disabled={trial.isPending}>
          Start starter trial (simulator)
        </Button>
      </section>
      <section className="border border-border bg-surface p-4">
        <h2 className="font-display text-2xl">Twilio</h2>
        <p className="mt-1 text-sm text-muted">
          I cannot open a Twilio account for you. Create one at twilio.com, buy a number, paste the three values here.
          Keys stay on this board, not in git.
        </p>
        <p className="mt-2 text-sm">
          {carrier.data?.connected
            ? `Carrier on · from ${carrier.data.from} · ${carrier.data.source}`
            : "Carrier off — Call speaks in the booth only."}
        </p>
        <form
          className="mt-4 grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            saveKeys.mutate();
          }}
        >
          <Field label="Account SID">
            <Input value={sid} onChange={(e) => setSid(e.target.value)} placeholder="ACxxxxxxxx" autoComplete="off" />
          </Field>
          <Field label="Auth token">
            <Input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="paste once"
              autoComplete="off"
            />
          </Field>
          <Field label="From number">
            <Input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="+15551234567" />
          </Field>
          <div className="flex items-end">
            <Button type="submit" disabled={saveKeys.isPending} className="w-full">
              Save carrier
            </Button>
          </div>
        </form>
        <BoardError error={saveKeys.error} />
        {saveKeys.isSuccess ? <p className="mt-2 text-sm text-ok">Saved. Chase → Call will ring if the sub number is real.</p> : null}
      </section>
      <section className="border border-border bg-surface p-4">
        <h2 className="font-display text-2xl">Evidence pack</h2>
        <p className="mt-1 text-sm text-muted">
          Point-in-time snapshot. Status is recomputed as you download — never copied from a stored checkbox. Hand this
          to the owner, the risk desk, or attach it to a detention dispute.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button tone="paper" onClick={() => pack.mutate()} disabled={pack.isPending}>
            Download evidence pack
          </Button>
          <Button tone="ghost" onClick={() => exp.mutate()} disabled={exp.isPending}>
            CSV
          </Button>
        </div>
      </section>
      <section className="border border-border bg-surface p-4">
        <h2 className="font-display text-2xl">Audit</h2>
        <ul className="mt-3 max-h-64 space-y-1 overflow-auto text-sm text-muted">
          {audit.data?.map((e) => (
            <li key={e.id}>
              <span className="text-fg">{e.action}</span> · {e.detail} · {e.created_at}
            </li>
          ))}
        </ul>
      </section>
      <section className="border border-bad/40 bg-surface p-4">
        <h2 className="font-display text-2xl text-bad">Delete my data</h2>
        <p className="text-sm text-muted">Type DELETE. Removes vendors, certificates, and files for your account.</p>
        <Input className="mt-2" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        <Button tone="danger" className="mt-3" disabled={confirm !== "DELETE" || wipe.isPending} onClick={() => wipe.mutate()}>
          Permanently delete
        </Button>
        <BoardError error={wipe.error} />
      </section>
    </div>
  );
}
