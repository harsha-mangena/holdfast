import type { VendorResult } from "./compliance";

export type ChaseKind = "paper" | "pay";

/** The GC already nags. We draft. We do not invent a dollar figure. */
export function paperScript(input: {
  orgName: string;
  vendor: string;
  gate: VendorResult["gate"];
  summary: string;
}): string {
  const who = input.orgName.trim() || "the general contractor";
  if (input.gate === "clear") {
    return `${input.vendor} is clear on coverage. Do not call them about the certificate.`;
  }
  const why =
    input.gate === "watch"
      ? `Your coverage is inside the thirty-day window. ${input.summary}.`
      : `You are on hold. ${input.summary}. You cannot enter the job.`;
  return [
    `This is ${who}.`,
    `Calling about ${input.vendor}.`,
    why,
    `Email a current ACORD 25 PDF. A screenshot is not enough.`,
    `Required on this job: one million occurrence, two million aggregate, additional insured, waiver of subrogation, workers compensation statutory.`,
  ].join(" ");
}

/** @deprecated use paperScript */
export const chaseScript = paperScript;

export function payScript(input: {
  orgName: string;
  vendor: string;
  amountLabel: string;
  reason: string;
}): string {
  const who = input.orgName.trim() || "the general contractor";
  const reason = input.reason.trim() || "open balance";
  return [
    `This is ${who}.`,
    `Calling ${input.vendor} about ${reason}.`,
    `Amount on our books: ${input.amountLabel}.`,
    `We need this closed. Call back or email confirmation today.`,
    `This is not a collections agency. This is the GC you are working for.`,
  ].join(" ");
}

export function paperMail(input: { vendor: string; script: string }) {
  return {
    subject: `COI required — ${input.vendor}`,
    body: input.script + "\n\nReply with the PDF.",
  };
}

export function payMail(input: { vendor: string; amountLabel: string; reason: string; script: string }) {
  return {
    subject: `Balance ${input.amountLabel} — ${input.vendor}`,
    body: input.script + (input.reason ? `\n\nRe: ${input.reason}` : ""),
  };
}

export function formatDollars(raw: string): string | null {
  const n = Number(String(raw).replace(/[$,]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}
