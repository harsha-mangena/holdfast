export const COVERAGE_TYPES = [
  "general_liability",
  "workers_comp",
  "auto",
  "umbrella",
  "excess",
  "professional",
  "other",
] as const;

export type CoverageType = (typeof COVERAGE_TYPES)[number];

export const COVERAGE_LABELS: Record<CoverageType, string> = {
  general_liability: "General liability",
  workers_comp: "Workers' compensation",
  auto: "Automobile",
  umbrella: "Umbrella",
  excess: "Excess",
  professional: "Professional / E&O",
  other: "Other",
};

export type ComplianceStatus = "compliant" | "expiring" | "expired" | "missing" | "insufficient";

export type CertStatus = "needs_review" | "confirmed" | "rejected" | "failed";

export interface RequirementLine {
  id: string;
  coverageType: CoverageType;
  perOccurrenceCents: number | null;
  aggregateCents: number | null;
  requiresAi: boolean;
  requiresWos: boolean;
}

export interface CoverageLine {
  id: string;
  certificateId: string;
  coverageType: CoverageType;
  insurer: string | null;
  policyNumber: string | null;
  effectiveDate: string | null;
  expirationDate: string | null;
  perOccurrenceCents: number | null;
  aggregateCents: number | null;
  additionalInsured: boolean | null;
  waiverOfSubrogation: boolean | null;
}

export interface ExtractedDraft {
  namedInsured: string | null;
  certificateHolder: string | null;
  producerName: string | null;
  producerEmail: string | null;
  lines: Array<{
    coverageType: CoverageType | "unknown";
    insurer: string | null;
    policyNumber: string | null;
    effectiveDate: string | null;
    expirationDate: string | null;
    perOccurrenceCents: number | null;
    aggregateCents: number | null;
    additionalInsured: boolean | null;
    waiverOfSubrogation: boolean | null;
    confidence: number | null;
  }>;
  extractor: string;
}

export const DEFAULT_REQUIREMENTS: Omit<RequirementLine, "id">[] = [
  {
    coverageType: "general_liability",
    perOccurrenceCents: 1_000_000_00,
    aggregateCents: 2_000_000_00,
    requiresAi: true,
    requiresWos: true,
  },
  {
    coverageType: "workers_comp",
    perOccurrenceCents: null,
    aggregateCents: 1_000_000_00,
    requiresAi: false,
    requiresWos: true,
  },
  {
    coverageType: "auto",
    perOccurrenceCents: 1_000_000_00,
    aggregateCents: null,
    requiresAi: true,
    requiresWos: false,
  },
  {
    coverageType: "umbrella",
    perOccurrenceCents: 5_000_000_00,
    aggregateCents: 5_000_000_00,
    requiresAi: false,
    requiresWos: false,
  },
];
