import { mailpitLatest, smtpSend } from "./smtp";

const g = globalThis as typeof globalThis & { __hfVerifyLinks?: Map<string, string> };

function box() {
  g.__hfVerifyLinks ??= new Map();
  return g.__hfVerifyLinks;
}

export function rememberVerifyLink(email: string, url: string) {
  box().set(email.trim().toLowerCase(), url);
}

export function peekVerifyLink(email: string): string | null {
  return box().get(email.trim().toLowerCase()) ?? null;
}

export async function sendVerifyMail(email: string, url: string) {
  rememberVerifyLink(email, url);
  const from = process.env.VERIFY_FROM?.trim() || "Holdfast <noreply@holdfast.local>";
  const text =
    "Confirm this is your work email so the board belongs to you.\n\n" +
    url +
    "\n\nIf you did not create a Holdfast account, ignore this.";
  const key = process.env.RESEND_API_KEY?.trim();
  if (key) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [email],
        subject: "Confirm your Holdfast email",
        text,
      }),
    });
    if (!res.ok) throw new Error("Could not send the confirm email.");
    return { sent: true, via: "resend" as const };
  }
  try {
    await smtpSend({ from, to: email, subject: "Confirm your Holdfast email", text });
    return { sent: true, via: "mailpit" as const };
  } catch {
    return { sent: false, via: "none" as const };
  }
}

export { mailpitLatest };
