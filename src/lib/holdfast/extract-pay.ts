export type PayDraft = {
  kind: "invoice" | "payment";
  amountCents: number | null;
  vendorName: string | null;
  docDate: string | null;
  memo: string | null;
  extractor: string;
};

function asCents(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value < 1000 ? Math.round(value * 100) : Math.round(value);
  }
  if (typeof value !== "string") return null;
  const n = Number(value.replace(/[$,]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n < 1000 ? Math.round(n * 100) : Math.round(n);
}

function heuristic(text: string): PayDraft {
  const money = text.match(/\$\s*([\d,]+(?:\.\d{2})?)/);
  const n = money ? Number(money[1].replace(/,/g, "")) : NaN;
  const kind = /paid|payment|check|ach|wire|receipt/i.test(text) ? "payment" : "invoice";
  return {
    kind,
    amountCents: Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null,
    vendorName: null,
    docDate: null,
    memo: null,
    extractor: "heuristic",
  };
}

export async function extractPay(text: string, images: string[] = []): Promise<PayDraft> {
  const apiKey = process.env.XAI_API_KEY;
  const clipped = text.slice(0, 8000);
  const pics = images.filter((u) => typeof u === "string" && u.startsWith("data:image/") && u.length < 1_800_000).slice(0, 2);
  if (!clipped.trim() && !pics.length) {
    return { kind: "invoice", amountCents: null, vendorName: null, docDate: null, memo: null, extractor: "empty" };
  }
  if (!apiKey) return heuristic(clipped);
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
    body: JSON.stringify({
      model: "grok-4.5",
      max_tokens: 600,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Read a construction pay app, invoice, or payment stub. Return JSON only: {kind:'invoice'|'payment', amountCents:number|null, vendorName:string|null, docDate:'YYYY-MM-DD'|null, memo:string|null}. amountCents is integer USD cents. Never invent a total that is not on the page. invoice = they billed the GC. payment = GC paid them.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: clipped.trim() ? clipped : "Scan only. Read the images." },
            ...pics.map((url) => ({ type: "image_url", image_url: { url } })),
          ],
        },
      ],
    }),
  });
  if (!res.ok) return heuristic(clipped);
  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  try {
    const o = JSON.parse(body.choices?.[0]?.message?.content ?? "{}") as Record<string, unknown>;
    const kind = o.kind === "payment" ? "payment" : "invoice";
    return {
      kind,
      amountCents: asCents(o.amountCents ?? o.amount),
      vendorName: typeof o.vendorName === "string" ? o.vendorName : null,
      docDate: typeof o.docDate === "string" ? o.docDate : null,
      memo: typeof o.memo === "string" ? o.memo : null,
      extractor: pics.length ? "grok-4.5-vision" : "grok-4.5",
    };
  } catch {
    return heuristic(clipped);
  }
}
