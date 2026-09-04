import net from "node:net";

export type SmtpMessage = {
  from: string;
  to: string;
  subject: string;
  text: string;
};

function addr(raw: string): string {
  const m = raw.match(/<([^>]+)>/);
  return (m ? m[1] : raw).trim();
}

export function smtpSend(msg: SmtpMessage): Promise<void> {
  const host = process.env.SMTP_HOST?.trim() || "127.0.0.1";
  const port = Number(process.env.SMTP_PORT || 1025);
  const from = addr(msg.from);
  const to = addr(msg.to);
  const payload =
    "From: " +
    msg.from +
    "\r\nTo: " +
    msg.to +
    "\r\nSubject: " +
    msg.subject +
    "\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n" +
    msg.text.replace(/\r?\n/g, "\r\n") +
    "\r\n.\r\n";

  const steps: { expect: number; send?: string }[] = [
    { expect: 220, send: "EHLO holdfast.local\r\n" },
    { expect: 250, send: "MAIL FROM:<" + from + ">\r\n" },
    { expect: 250, send: "RCPT TO:<" + to + ">\r\n" },
    { expect: 250, send: "DATA\r\n" },
    { expect: 354, send: payload },
    { expect: 250, send: "QUIT\r\n" },
    { expect: 221 },
  ];

  return new Promise((resolve, reject) => {
    const sock = net.connect({ host, port });
    let buf = "";
    let i = 0;
    const timer = setTimeout(() => {
      sock.destroy();
      reject(new Error("Mailpit did not answer on SMTP. Is it running?"));
    }, 8000);
    const done = (err?: Error) => {
      clearTimeout(timer);
      sock.end();
      if (err) reject(err);
      else resolve();
    };
    sock.setEncoding("utf8");
    sock.on("error", (e) => done(e));
    sock.on("data", (chunk: string) => {
      buf += chunk;
      while (buf.includes("\n")) {
        const n = buf.indexOf("\n");
        const line = buf.slice(0, n).replace(/\r$/, "");
        buf = buf.slice(n + 1);
        if (line.length < 3) continue;
        if (line[3] === "-") continue;
        const code = Number(line.slice(0, 3));
        const step = steps[i];
        if (!step) return;
        if (code >= 400) return done(new Error("Mail server refused: " + line));
        if (code !== step.expect) return done(new Error("Mail server unexpected reply: " + line));
        if (step.send) sock.write(step.send);
        i += 1;
        if (i >= steps.length) done();
      }
    });
  });
}

export async function mailpitLatest(email: string): Promise<{ subject: string; text: string; id: string } | null> {
  const base = (process.env.MAILPIT_URL?.trim() || "http://127.0.0.1:8025/mailpit").replace(/\/$/, "");
  try {
    const list = await fetch(base + "/api/v1/messages?limit=20&query=" + encodeURIComponent("to:" + email));
    if (!list.ok) return null;
    const body = (await list.json()) as { messages?: { ID: string; Subject: string }[] };
    const first = body.messages?.[0];
    if (!first) return null;
    const one = await fetch(base + "/api/v1/message/" + first.ID);
    if (!one.ok) return null;
    const msg = (await one.json()) as { Subject?: string; Text?: string };
    return { id: first.ID, subject: msg.Subject || first.Subject, text: msg.Text || "" };
  } catch {
    return null;
  }
}
