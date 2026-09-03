import { COVERAGE_TYPES, type ExtractedDraft, type CoverageType } from "./types";

const SCHEMA_HINT = `Return ONLY JSON with this shape:
{
  "namedInsured": string|null,
  "certificateHolder": string|null,
  "producerName": string|null,
  "producerEmail": string|null,
  "lines": [
    {
      "coverageType": "general_liability"|"workers_comp"|"auto"|"umbrella"|"excess"|"professional"|"other",
      "insurer": string|null,
      "policyNumber": string|null,
      "effectiveDate": "YYYY-MM-DD"|null,
      "expirationDate": "YYYY-MM-DD"|null,
      "perOccurrenceCents": number|null,
      "aggregateCents": number|null,
      "additionalInsured": boolean|null,
      "waiverOfSubrogation": boolean|null,
      "confidence": number
    }
  ]
}
This is an ACORD 25 (or close). coverageType MUST be one of the snake_case enums above — never "General Liability".
Map: CGL/GL → general_liability; WC / workers compensation → workers_comp; business auto / hired auto → auto.
Limits are integer US cents ($1,000,000 = 100000000). Dates ISO YYYY-MM-DD even if the form says 1/1/26.
Read INSURER A/B/C/D boxes, POLICY EFF, POLICY EXP, ADDL INSR, SUBR WVD.
If a field is unreadable, null. Never invent a policy number. Skip blank coverage rows.`;

const TYPE_ALIASES: Array<[RegExp, CoverageType]> = [
  [/workers'?s?\s*comp|workcomp|\bwc\b|worker's compensation/i, "workers_comp"],
  [/commercial general|general liability|\bcgl\b|\bgl\b/i, "general_liability"],
  [/umbrella/i, "umbrella"],
  [/excess/i, "excess"],
  [/professional|errors?\s*&\s*omissions|\be&o\b/i, "professional"],
  [/auto|business auto|hired auto|non-owned/i, "auto"],
];

function asType(value: unknown): CoverageType {
  const s = String(value ?? "").trim();
  if ((COVERAGE_TYPES as readonly string[]).includes(s)) return s as CoverageType;
  for (const [re, t] of TYPE_ALIASES) if (re.test(s)) return t;
  return "other";
}

function asDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (iso) return s;
  const us = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/.exec(s);
  if (!us) return null;
  let y = Number(us[3]);
  if (y < 100) y += y >= 70 ? 1900 : 2000;
  return `${y}-${String(Number(us[1])).padStart(2, "0")}-${String(Number(us[2])).padStart(2, "0")}`;
}

function asCents(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value < 1000 ? Math.round(value * 100) : Math.round(value);
  }
  if (typeof value !== "string") return null;
  const n = Number(value.replace(/[$,]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n < 1000 ? Math.round(n * 100) : Math.round(n);
}

function asBool(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (/^(y|yes|true|x|checked)$/i.test(value.trim())) return true;
    if (/^(n|no|false)$/i.test(value.trim())) return false;
  }
  return null;
}

function parseDraft(raw: unknown, extractor: string): ExtractedDraft {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const linesIn = Array.isArray(o.lines) ? o.lines : [];
  const named = o.namedInsured ?? o.named_insured ?? o.insured;
  const holder = o.certificateHolder ?? o.certificate_holder ?? o.holder;
  return {
    extractor,
    namedInsured: typeof named === "string" ? named.trim() : null,
    certificateHolder: typeof holder === "string" ? holder.trim() : null,
    producerName: typeof o.producerName === "string" ? o.producerName : typeof o.producer_name === "string" ? o.producer_name : null,
    producerEmail: typeof o.producerEmail === "string" ? o.producerEmail : typeof o.producer_email === "string" ? o.producer_email : null,
    lines: linesIn
      .map((line) => {
        const L = (line && typeof line === "object" ? line : {}) as Record<string, unknown>;
        return {
          coverageType: asType(L.coverageType ?? L.coverage_type ?? L.type),
          insurer: typeof L.insurer === "string" ? L.insurer.trim() : typeof L.company === "string" ? L.company.trim() : null,
          policyNumber: typeof L.policyNumber === "string" ? L.policyNumber.trim() : typeof L.policy_number === "string" ? L.policy_number.trim() : null,
          effectiveDate: asDate(L.effectiveDate ?? L.effective_date ?? L.eff),
          expirationDate: asDate(L.expirationDate ?? L.expiration_date ?? L.exp),
          perOccurrenceCents: asCents(L.perOccurrenceCents ?? L.per_occurrence_cents ?? L.eachOccurrence ?? L.limit),
          aggregateCents: asCents(L.aggregateCents ?? L.aggregate_cents ?? L.generalAggregate),
          additionalInsured: asBool(L.additionalInsured ?? L.additional_insured ?? L.addlInsr),
          waiverOfSubrogation: asBool(L.waiverOfSubrogation ?? L.waiver_of_subrogation ?? L.subrWvd),
          confidence: typeof L.confidence === "number" ? L.confidence : null,
        };
      })
      .filter((l) => l.insurer || l.policyNumber || l.expirationDate || l.coverageType !== "other"),
  };
}

function heuristic(text: string): ExtractedDraft {
  const named =
    /named\s*insured[:\s]+([A-Z][^\n]{3,80})/i.exec(text)?.[1]?.trim() ??
    /insured[:\s]+([A-Z][^\n]{3,80})/i.exec(text)?.[1]?.trim() ??
    null;
  const holder = /certificate\s*holder[:\s]+([^\n]{3,80})/i.exec(text)?.[1]?.trim() ?? null;
  const dateRe = /(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/g;
  const dates: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = dateRe.exec(text))) {
    const d = asDate(m[0]);
    if (d) dates.push(d);
  }
  const dollars = [...text.matchAll(/\$\s*[\d,]+(?:\.\d{2})?/g)].map((x) => asCents(x[0])).filter((n): n is number => n != null);
  const lines: ExtractedDraft["lines"] = [];
  TYPE_ALIASES.forEach(([re, type], i) => {
    if (type === "other") return;
    if (!re.test(text)) return;
    if (lines.some((l) => l.coverageType === type)) return;
    lines.push({
      coverageType: type,
      insurer: /insurer\s+[a-d][:\s]+([^\n]+)/i.exec(text)?.[1]?.trim() ?? null,
      policyNumber: /policy\s*(?:no|number|#)[:\s]+([A-Z0-9][A-Z0-9-]{3,})/i.exec(text)?.[1] ?? null,
      effectiveDate: dates[i * 2] ?? dates[0] ?? null,
      expirationDate: dates[i * 2 + 1] ?? dates[1] ?? null,
      perOccurrenceCents: dollars[0] ?? null,
      aggregateCents: dollars[1] ?? dollars[0] ?? null,
      additionalInsured: /additional insured|addl\s*insr/i.test(text),
      waiverOfSubrogation: /waiver of subrogation|subr\s*wvd/i.test(text),
      confidence: 0.35,
    });
  });
  return {
    extractor: "heuristic",
    namedInsured: named,
    certificateHolder: holder,
    producerName: null,
    producerEmail: null,
    lines,
  };
}

export async function extractCertificate(text: string, images: string[] = []): Promise<ExtractedDraft> {
  const apiKey = process.env.XAI_API_KEY;
  const clipped = text.slice(0, 12000);
  const pics = images.filter((url) => typeof url === "string" && url.startsWith("data:image/") && url.length < 1_800_000).slice(0, 2);
  if (!clipped.trim() && pics.length === 0) {
    return {
      extractor: "empty",
      namedInsured: null,
      certificateHolder: null,
      producerName: null,
      producerEmail: null,
      lines: [],
    };
  }
  if (!apiKey) return heuristic(clipped);

  const userContent: Array<Record<string, unknown>> = [
    {
      type: "text",
      text:
        (clipped.trim()
          ? "Text layer from the PDF (may be sparse or column-scrambled on ACORD forms):\n" + clipped
          : "No text layer — this is a scan. Read the page images as an ACORD 25.") +
        "\n\n" +
        SCHEMA_HINT,
    },
  ];
  for (const url of pics) {
    userContent.push({ type: "image_url", image_url: { url } });
  }

  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + apiKey,
    },
    body: JSON.stringify({
      model: "grok-4.5",
      max_tokens: 2200,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a COI clerk reading ACORD 25. Prefer the page image over a scrambled text layer. coverageType is snake_case enum only. Never invent policy numbers.",
        },
        { role: "user", content: userContent },
      ],
    }),
  });
  if (!res.ok) return heuristic(clipped);
  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = body.choices?.[0]?.message?.content ?? "{}";
  try {
    const parsed = parseDraft(JSON.parse(content), pics.length ? "grok-4.5-vision" : "grok-4.5");
    if (!parsed.lines.length && clipped.trim()) {
      const h = heuristic(clipped);
      if (h.lines.length) return { ...parsed, lines: h.lines, extractor: parsed.extractor + "+heuristic" };
    }
    return parsed;
  } catch {
    return heuristic(clipped);
  }
}
