import { useState, type FormEvent } from "react";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button, Field, Input } from "@/components/ui-kit";

export function AuthModal({
  open,
  reason,
  onClose,
  onAuthed,
}: {
  open: boolean;
  reason: string;
  onClose: () => void;
  onAuthed?: () => void;
}) {
  const { user, isPending } = useCurrentUserState();
  const [mode, setMode] = useState<"in" | "up">("up");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  if (!isPending && user) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-bg/80 p-4" role="dialog">
        <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6">
          <h2 className="font-display text-3xl">You are in</h2>
          <p className="mt-2 text-sm text-muted">{reason}</p>
          <div className="mt-6 flex gap-2">
            <Button
              className="flex-1"
              onClick={() => {
                onAuthed?.();
                onClose();
              }}
            >
              Keep this board
            </Button>
            <Button tone="ghost" onClick={onClose}>
              Not now
            </Button>
          </div>
        </div>
      </div>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "up") {
        const res = await authClient.signUp.email({ email, password, name: name || email.split("@")[0] });
        if (res.error) throw new Error(res.error.message);
      } else {
        const res = await authClient.signIn.email({ email, password });
        if (res.error) throw new Error(res.error.message);
      }
      onAuthed?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not continue");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-bg/80 p-0 sm:place-items-center sm:p-4" role="dialog">
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-lg border border-border bg-surface p-6 sm:rounded-lg">
        <p className="text-[11px] uppercase tracking-[0.2em] text-primary">Almost — this is the lock</p>
        <h2 className="mt-2 font-display text-3xl">The demo resets when you leave</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{reason}</p>
        {authEnabled ? (
          <div className="mt-4 space-y-2">
            {GROK_PROVIDERS.map((p) => (
              <Button
                key={p.providerId}
                type="button"
                tone="ghost"
                className="w-full"
                onClick={() => signIn(p.providerId, { callbackURL: "/app" })}
              >
                Continue with {p.label}
              </Button>
            ))}
          </div>
        ) : null}
        <form onSubmit={(e) => void onSubmit(e)} className="mt-4 space-y-3">
          {mode === "up" ? (
            <Field label="Your name">
              <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </Field>
          ) : null}
          <Field label="Work email">
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </Field>
          <Field label="Password">
            <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          {error ? <p className="text-sm text-bad">{error}</p> : null}
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Working…" : mode === "up" ? "Create account — keep watching" : "Sign in — keep watching"}
          </Button>
        </form>
        <button type="button" className="mt-3 text-sm text-muted underline" onClick={() => setMode(mode === "up" ? "in" : "up")}>
          {mode === "up" ? "Already have an account?" : "Need an account?"}
        </button>
        <button type="button" className="mt-2 block w-full text-center text-sm text-muted" onClick={onClose}>
          Keep playing the demo
        </button>
      </div>
    </div>
  );
}
