import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { authClient } from "@/lib/auth/client";
import { stagingVerifyLink } from "@/lib/auth/verify-actions";
import { Button } from "@/components/ui-kit";
import { userFacing } from "@/lib/holdfast/errors";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/verify")({
  validateSearch: (s: Record<string, unknown>) => ({ email: typeof s.email === "string" ? s.email : "" }),
  component: Verify,
});

function extractHttp(text: string): string[] {
  return Array.from(text.matchAll(/https?:\/\/[^\s]+/g), (m) => m[0].replace(/[.,;)]+$/, "")).filter(
    (u) => !/example\.com/i.test(u),
  );
}

function Verify() {
  const { email } = Route.useSearch();
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const link = useQuery({
    queryKey: ["verify-link", email],
    queryFn: () => stagingVerifyLink({ data: { email } }),
    enabled: Boolean(email),
  });

  async function resend() {
    if (!email) return;
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const res = await authClient.sendVerificationEmail({ email, callbackURL: window.location.origin + "/app" });
      if (res.error) throw new Error(res.error.message);
      setMsg("Sent again. Check the inbox — and spam.");
      void link.refetch();
    } catch (e) {
      setErr(userFacing(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-4 text-fg">
      <div className="w-full max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="font-display text-3xl text-primary">
            HOLDFAST
          </Link>
          <ThemeToggle />
        </div>
        <p className="text-[11px] uppercase tracking-[0.22em] text-primary">Integrity</p>
        <h1 className="font-display text-4xl">Confirm the work email</h1>
        <p className="text-sm leading-relaxed text-muted">
          The board is tied to a person. We send a link to {email || "the address you used"}. Until you open it, nobody
          gets in — including you. Google and X already proved the inbox.
        </p>
        {email ? (
          <Button type="button" disabled={busy || !email} onClick={() => void resend()}>
            {busy ? "Sending…" : "Resend the link"}
          </Button>
        ) : (
          <Link to="/login" className="text-sm text-primary underline">
            Back to sign in
          </Link>
        )}
        {msg ? <p className="text-sm text-ok">{msg}</p> : null}
        {err ? <p className="text-sm text-bad">{err}</p> : null}
        {link.data?.mail ? (
          <div className="space-y-2 border border-border bg-surface p-3 text-sm">
            <p className="text-[11px] uppercase tracking-wider text-primary">Mailpit inbox</p>
            <p className="font-medium">{link.data.mail.subject}</p>
            <pre className="whitespace-pre-wrap break-all text-xs text-muted">{link.data.mail.text}</pre>
            {extractHttp(link.data.mail.text).map((u) => (
              <a key={u} href={u} className="block text-sm text-primary underline">
                Open confirm link
              </a>
            ))}
          </div>
        ) : link.data?.url ? (
          <p className="break-all border border-border bg-surface p-3 text-xs text-muted">
            SMTP was down. Open this once:{" "}
            <a className="text-primary underline" href={link.data.url}>
              {link.data.url}
            </a>
          </p>
        ) : (
          <p className="text-xs text-muted">Waiting on the confirm mail. Resend if the inbox is empty.</p>
        )}
        <p className="text-xs text-muted">
          SMTP <code className="text-fg">smtp://127.0.0.1:1025</code>
          {" · "}
          <a href="/mailpit/" className="text-primary underline">
            Mailpit
          </a>
        </p>
      </div>
    </main>
  );
}
