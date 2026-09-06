import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { Button, Field, Input } from "@/components/ui-kit";
import { userFacing } from "@/lib/holdfast/errors";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "up") {
        const res = await authClient.signUp.email({
          email,
          password,
          name: name || email.split("@")[0],
          callbackURL: window.location.origin + "/app",
        });
        if (res.error) throw new Error(res.error.message);
        window.location.assign("/verify?email=" + encodeURIComponent(email));
        return;
      }
      const res = await authClient.signIn.email({ email, password, callbackURL: "/app" });
      if (res.error) throw new Error(res.error.message);
      void nav({ to: "/app" });
    } catch (err) {
      setError(userFacing(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-bg px-4 text-fg">
      <div className="w-full max-w-sm space-y-5">
        <div className="flex items-center justify-between">
          <Link to="/" className="font-display text-3xl text-primary">
            HOLDFAST
          </Link>
          <ThemeToggle />
        </div>
        <h1 className="font-display text-3xl">Sign in to the board</h1>
        <p className="text-sm text-muted">GCs sign in. We never sell coverage. Staging: use a real account, fake PDFs.</p>
        {authEnabled ? (
          <div className="space-y-2">
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
        ) : (
          <p className="text-sm text-muted">Sign-in is disabled.</p>
        )}
        <div className="border-t border-border pt-4">
          <form onSubmit={(e) => void onSubmit(e)} className="space-y-3">
            {mode === "up" ? (
              <Field label="Name">
                <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
              </Field>
            ) : null}
            <Field label="Work email">
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </Field>
            <Field label="Password">
              <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "up" ? "new-password" : "current-password"} />
            </Field>
            {error ? <p className="text-sm text-bad">{error}</p> : null}
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Working…" : mode === "up" ? "Create account" : "Sign in with email"}
            </Button>
          </form>
          <button type="button" className="mt-3 text-sm text-muted underline" onClick={() => setMode(mode === "up" ? "in" : "up")}>
            {mode === "up" ? "Have an account? Sign in" : "New company? Create an account"}
          </button>
        </div>
      </div>
    </main>
  );
}
