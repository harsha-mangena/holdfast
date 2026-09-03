/** Tiny valid ACORD-shaped PDF for the Iron Ridge sample. Not a real certificate. */
export function sampleAcordPdfBase64(): string {
  const lines = [
    "ACORD 25  CERTIFICATE OF INSURANCE  SAMPLE",
    "Named Insured: Iron Ridge Electric LLC",
    "Certificate Holder: Northfork GC",
    "Producer: Harbor Agency",
    "Insurer A: Hartford  Policy GL-4419",
    "Commercial General Liability",
    "Effective: 2025-01-01    Expiration: 2026-01-01",
    "Each Occurrence: $1,000,000   Aggregate: $2,000,000",
    "Additional Insured: Yes    Waiver of Subrogation: No",
    "STATUS MARK: EXPIRED",
  ];
  const ops = lines
    .map((line, i) => {
      const safe = line.replace(/[()\\]/g, " ");
      return i === 0 ? `BT /F1 12 Tf 50 740 Td (${safe}) Tj` : `0 -18 Td (${safe}) Tj`;
    })
    .join("\n");
  const stream = `${ops}\nET`;
  const parts = [
    "1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n",
    "2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n",
    "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj\n",
    `4 0 obj<< /Length ${stream.length} >>stream\n${stream}\nendstream\nendobj\n`,
    "5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n",
  ];
  let body = "%PDF-1.4\n";
  const offsets = [0];
  for (const part of parts) {
    offsets.push(Buffer.byteLength(body, "latin1"));
    body += part;
  }
  const startxref = Buffer.byteLength(body, "latin1");
  let xref = `xref\n0 ${parts.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= parts.length; i++) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  body += xref;
  body += `trailer<< /Size ${parts.length + 1} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF`;
  return Buffer.from(body, "latin1").toString("base64");
}

export const SAMPLE_EXTRACTION = {
  extractor: "sample",
  namedInsured: "Iron Ridge Electric LLC",
  certificateHolder: "Northfork GC",
  producerName: "Harbor Agency",
  producerEmail: "certs@harbor.example",
  lines: [
    {
      coverageType: "general_liability",
      insurer: "Hartford",
      policyNumber: "GL-4419",
      effectiveDate: "2025-01-01",
      expirationDate: "2026-01-01",
      perOccurrenceCents: 100000000,
      aggregateCents: 200000000,
      additionalInsured: true,
      waiverOfSubrogation: false,
      confidence: 1,
    },
  ],
};
