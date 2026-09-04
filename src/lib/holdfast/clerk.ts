import { chaseScript } from "./chase";
import type { VendorResult } from "./compliance";

export function speakable(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export type ClerkTurn = { role: "user" | "clerk"; text: string };

function boardText(org: string, vendors: VendorResult[]): string {
  if (!vendors.length) return `${org}: empty board. No subs.`;
  return vendors
    .map((v) => `${v.vendorName} | gate=${v.gate} | ${v.status} | ${v.summary}`)
    .join("\n");
}

export function localClerk(question: string, org: string, vendors: VendorResult[]): string | null {
  const q = question.toLowerCase();
  const hold = vendors.filter((v) => v.gate === "hold");
  const watch = vendors.filter((v) => v.gate === "watch");
  if (/who.*(hold|cannot|can't|fence|enter|dispatch)/i.test(q) || /hold\??$/.test(q.trim())) {
    if (!hold.length) return "Nobody is on HOLD. The fence is open on coverage.";
    return hold.map((v) => `${v.vendorName}: HOLD. ${v.summary}`).join("\n");
  }
  if (/watch|30[- ]day|expir/.test(q) && !/script|call|chase/.test(q)) {
    if (!watch.length && !hold.length) return "Nobody on the 30-day clock.";
    return [...hold, ...watch].map((v) => `${v.vendorName}: ${v.gate.toUpperCase()} — ${v.summary}`).join("\n");
  }
  if (/chase|script|call|say to/.test(q)) {
    const named = vendors.find((v) => q.includes(v.vendorName.toLowerCase()));
    const target = named ?? hold[0] ?? watch[0];
    if (!target) return "Nobody to chase. Board is clear.";
    return chaseScript({ orgName: org, vendor: target.vendorName, gate: target.gate, summary: target.summary });
  }
  if (/clear|who can/.test(q)) {
    const clear = vendors.filter((v) => v.gate === "clear");
    if (!clear.length) return "Nobody is CLEAR.";
    return clear.map((v) => v.vendorName).join(", ") + " may enter.";
  }
  return null;
}

export async function grokClerk(
  question: string,
  history: ClerkTurn[],
  org: string,
  vendors: VendorResult[],
): Promise<string> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    return (
      localClerk(question, org, vendors) ??
      "No model key in this preview. I can still list HOLD, WATCH, CLEAR, and draft a chase script — ask that."
    );
  }
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
    body: JSON.stringify({
      model: "grok-4.5",
      max_tokens: 700,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `You are the Holdfast clerk — a jobsite radio, not a lawyer and not a chatbot mascot.
Company: ${org}
Board (derived; you cannot change it):
${boardText(org, vendors)}

Rules:
- Quote gates: CLEAR / WATCH / HOLD. Never say a sub is "compliant" unless the board says CLEAR.
- Never invent a limit, date, policy number, or invoice. We do not collect money.
- If asked to clear someone, refuse. Confirm is human. Status is computed.
- Chase scripts: paper from the board, or pay only if the user typed an amount. Never invent dollars.
- You are not a collections agency. You draft what the GC was going to say anyway.
- Short. Superintendent English. No emojis. No markdown. No asterisks. Plain sentences.`,
        },
        ...history.slice(-6).map((t) => ({ role: t.role === "clerk" ? "assistant" : "user", content: t.text })),
        { role: "user", content: question },
      ],
    }),
  });
  if (!res.ok) return speakable(localClerk(question, org, vendors) ?? "Clerk is down. Use the board.");
  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return speakable(body.choices?.[0]?.message?.content?.trim() || "No answer.");
}
