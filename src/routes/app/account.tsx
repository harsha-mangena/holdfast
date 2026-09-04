import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { bootstrap, listDashboard, saveOrg } from "@/lib/holdfast/actions";
import { authEnabled, signOut } from "@/lib/auth/client";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { BoardError, Button, Field, Input } from "@/components/ui-kit";

export const Route = createFileRoute("/app/account")({ component: Account });

function Account() {
  const user = useCurrentUser();
  const qc = useQueryClient();
  const org = useQuery({ queryKey: ["org"], queryFn: () => bootstrap() });
  const board = useQuery({ queryKey: ["dashboard"], queryFn: () => listDashboard() });
  const [name, setName] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  useEffect(() => {
    if (org.data?.name) setName(org.data.name);
  }, [org.data]);

  const save = useMutation({
    mutationFn: () => saveOrg({ data: { name } }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["org"] }),
  });

  const gates = { clear: 0, watch: 0, hold: 0 };
  for (const v of board.data?.vendors ?? []) gates[v.gate] += 1;
  const label = user?.displayName ?? user?.primaryEmail ?? "Account";

  return (
    <div className="space-y-8">
      <header>
        <p className="text-[11px] uppercase tracking-[0.24em] text-primary">Signed in</p>
        <h1 className="font-display text-4xl">Account</h1>
        <p className="mt-1 text-sm text-muted">Who you are. Which company the board belongs to. Who cannot enter the job today.</p>
      </header>

      <section className="flex flex-wrap items-center gap-4 border border-border bg-surface p-4">
        {user?.profileImageUrl ? (
          <img src={user.profileImageUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <span className="grid h-16 w-16 place-items-center rounded-full bg-raised font-display text-3xl text-primary">
            {label.charAt(0).toUpperCase()}
          </span>
        )}
        <div>
          <div className="font-display text-2xl">{label}</div>
          <div className="text-sm text-muted">{user?.primaryEmail ?? "No email on this session"}</div>
          {user?.isDevFallback ? <div className="text-xs text-warn">Local fallback user — auth is off.</div> : null}
        </div>
      </section>

      <section className="border border-border bg-surface p-4">
        <h2 className="font-display text-2xl">Company</h2>
        <form
          className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="flex-1">
            <Field label="Name on the evidence pack">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
          </div>
          <Button type="submit" disabled={save.isPending}>
            Save
          </Button>
        </form>
        <BoardError error={save.error} />
        <p className="mt-3 text-sm text-muted">
          Plan {org.data?.plan ?? "—"} · billing {org.data?.billing_status ?? "—"}.{" "}
          <Link to="/app/settings" className="text-primary underline">
            Office
          </Link>
        </p>
      </section>

      <section className="grid grid-cols-3 gap-2">
        <Gate n={gates.clear} t="Clear" d="May enter" />
        <Gate n={gates.watch} t="Watch" d="Inside 30 days" />
        <Gate n={gates.hold} t="Hold" d="Do not dispatch" />
      </section>

      {authEnabled ? (
        <Button
          tone="ghost"
          disabled={signingOut}
          onClick={() => {
            setSigningOut(true);
            void signOut().catch(() => setSigningOut(false));
          }}
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </Button>
      ) : null}
    </div>
  );
}

function Gate({ n, t, d }: { n: number; t: string; d: string }) {
  return (
    <div className="border border-border bg-surface p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted">{t}</div>
      <div className="font-display text-3xl">{n}</div>
      <div className="text-xs text-muted">{d}</div>
    </div>
  );
}
