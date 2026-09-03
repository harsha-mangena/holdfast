import type { ComplianceStatus, CoverageLine, RequirementLine } from "./types";
import { COVERAGE_LABELS } from "./types";

export const SEVERITY: Record<ComplianceStatus, number> = {
  expired: 4,
  missing: 3,
  insufficient: 2,
  expiring: 1,
  compliant: 0,
};

const WINDOW_DAYS = 30;

function daysUntil(iso: string, now: Date): number {
  const then = Date.parse(iso + "T00:00:00Z");
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((then - today) / 86_400_000);
}

function money(cents: number | null): string {
  if (cents == null) return "none";
  return "$" + (cents / 100).toLocaleString("en-US");
}

export interface LineResult {
  coverageType: RequirementLine["coverageType"];
  status: ComplianceStatus;
  explanation: string;
}

export interface VendorResult {
  vendorId: string;
  vendorName: string;
  status: ComplianceStatus;
  summary: string;
  lines: LineResult[];
  pendingReview: number;
  gate: "clear" | "watch" | "hold";
  clockDays: number | null;
}

export function computeVendor(input: {
  vendorId: string;
  vendorName: string;
  requirements: RequirementLine[];
  coverage: CoverageLine[];
  pendingReview?: number;
  now?: Date;
}): VendorResult {
  const now = input.now ?? new Date();
  const pendingReview = input.pendingReview ?? 0;
  const lines: LineResult[] = input.requirements.map((req) => {
    const ofType = input.coverage.filter((c) => c.coverageType === req.coverageType);
    const current = ofType.reduce<CoverageLine | null>((best, line) => {
      if (!best) return line;
      return (line.expirationDate ?? "") > (best.expirationDate ?? "") ? line : best;
    }, null);
    const label = COVERAGE_LABELS[req.coverageType];
    if (!current) {
      return { coverageType: req.coverageType, status: "missing", explanation: label + " not on file" };
    }
    const days = current.expirationDate ? daysUntil(current.expirationDate, now) : null;
    if (days != null && days < 0) {
      return { coverageType: req.coverageType, status: "expired", explanation: label + " expired" };
    }
    if (days != null && days <= WINDOW_DAYS) {
      return {
        coverageType: req.coverageType,
        status: "expiring",
        explanation: label + " expires in " + days + " day" + (days === 1 ? "" : "s"),
      };
    }
    const problems: string[] = [];
    if (req.perOccurrenceCents != null && (current.perOccurrenceCents ?? 0) < req.perOccurrenceCents) {
      problems.push("occurrence " + money(current.perOccurrenceCents) + " < " + money(req.perOccurrenceCents));
    }
    if (req.aggregateCents != null && (current.aggregateCents ?? 0) < req.aggregateCents) {
      problems.push("aggregate below required");
    }
    if (req.requiresAi && current.additionalInsured !== true) problems.push("additional insured missing");
    if (req.requiresWos && current.waiverOfSubrogation !== true) problems.push("waiver of subrogation missing");
    if (problems.length) {
      return {
        coverageType: req.coverageType,
        status: "insufficient",
        explanation: label + ": " + problems.join("; "),
      };
    }
    return {
      coverageType: req.coverageType,
      status: "compliant",
      explanation: label + " in force",
    };
  });

  let status: ComplianceStatus = "compliant";
  for (const line of lines) {
    if (SEVERITY[line.status] > SEVERITY[status]) status = line.status;
  }
  const problems = lines.filter((l) => l.status !== "compliant").map((l) => l.explanation);
  let summary =
    lines.length === 0
      ? "No coverage requirements configured."
      : problems.length === 0
        ? "All required coverage is in place."
        : problems.slice(0, 2).join("; ");
  if (pendingReview > 0) summary += (summary ? " · " : "") + pendingReview + " awaiting review";
  const gate = status === "compliant" ? "clear" : status === "expiring" ? "watch" : "hold";
  const clocks = input.coverage
    .map((c) => (c.expirationDate ? daysUntil(c.expirationDate, now) : null))
    .filter((d): d is number => d != null);
  const clockDays = clocks.length ? Math.min(...clocks) : null;
  return { vendorId: input.vendorId, vendorName: input.vendorName, status, summary, lines, pendingReview, gate, clockDays };
}
