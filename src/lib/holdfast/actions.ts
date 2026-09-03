import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { extractCertificate } from "./extract";
import { computeVendor, SEVERITY } from "./compliance";
import { sampleAcordPdfBase64, SAMPLE_EXTRACTION } from "./sample-pdf";
import {
  DEFAULT_REQUIREMENTS,
  type CoverageLine,
  type CoverageType,
  type ExtractedDraft,
  type RequirementLine,
} from "./types";

function id(): string {
  return crypto.randomUUID();
}

async function audit(sql: Awaited<ReturnType<typeof getSql>>, userId: string, action: string, detail: string) {
  await sql`insert into hf_audit (id, user_id, action, detail) values (${id()}, ${userId}, ${action}, ${detail})`;
}

async function ensureOrg(sql: Awaited<ReturnType<typeof getSql>>, userId: string) {
  const existing = await sql<{ user_id: string }>`select user_id from hf_orgs where user_id = ${userId}`;
  if (existing.length) return;
  await sql`insert into hf_orgs (user_id, name) values (${userId}, ${"My company"})`;
  for (const req of DEFAULT_REQUIREMENTS) {
    await sql`
      insert into hf_requirement_lines
        (id, user_id, coverage_type, per_occurrence_cents, aggregate_cents, requires_ai, requires_wos)
      values (
        ${id()}, ${userId}, ${req.coverageType}, ${req.perOccurrenceCents},
        ${req.aggregateCents}, ${req.requiresAi}, ${req.requiresWos}
      )`;
  }
  await audit(sql, userId, "org.bootstrap", "Default GC requirement template created");
}

type ReqRow = {
  id: string;
  coverage_type: string;
  per_occurrence_cents: number | null;
  aggregate_cents: number | null;
  requires_ai: boolean;
  requires_wos: boolean;
};

type CovRow = {
  id: string;
  certificate_id: string;
  coverage_type: string;
  insurer: string | null;
  policy_number: string | null;
  effective_date: string | null;
  expiration_date: string | null;
  per_occurrence_cents: number | null;
  aggregate_cents: number | null;
  additional_insured: boolean | null;
  waiver_of_subrogation: boolean | null;
};

function mapReq(r: ReqRow): RequirementLine {
  return {
    id: r.id,
    coverageType: r.coverage_type as CoverageType,
    perOccurrenceCents: r.per_occurrence_cents,
    aggregateCents: r.aggregate_cents,
    requiresAi: r.requires_ai,
    requiresWos: r.requires_wos,
  };
}

function mapCov(r: CovRow): CoverageLine {
  return {
    id: r.id,
    certificateId: r.certificate_id,
    coverageType: r.coverage_type as CoverageType,
    insurer: r.insurer,
    policyNumber: r.policy_number,
    effectiveDate: r.effective_date,
    expirationDate: r.expiration_date,
    perOccurrenceCents: r.per_occurrence_cents,
    aggregateCents: r.aggregate_cents,
    additionalInsured: r.additional_insured,
    waiverOfSubrogation: r.waiver_of_subrogation,
  };
}

export const bootstrap = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ensureOrg(sql, context.userId);
    const org = await sql<{ name: string; plan: string; billing_status: string }>`
      select name, plan, billing_status from hf_orgs where user_id = ${context.userId}`;
    return org[0] ?? { name: "My company", plan: "starter", billing_status: "none" };
  });

export const saveOrg = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { name: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureOrg(sql, context.userId);
    const name = data.name.trim();
    if (!name) throw new Error("Company name is required");
    await sql`update hf_orgs set name = ${name} where user_id = ${context.userId}`;
    await audit(sql, context.userId, "org.rename", name);
    return { name };
  });

export const listDashboard = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ensureOrg(sql, context.userId);
    const vendors = await sql<{ id: string; name: string; trade: string | null; active: boolean }>`
      select id, name, trade, active from hf_vendors where user_id = ${context.userId} and active = true order by name`;
    const reqs = await sql<ReqRow>`
      select id, coverage_type, per_occurrence_cents, aggregate_cents, requires_ai, requires_wos
      from hf_requirement_lines where user_id = ${context.userId}`;
    const cov = await sql<CovRow & { vendor_id: string | null }>`
      select cl.id, cl.certificate_id, cl.coverage_type, cl.insurer, cl.policy_number,
             cl.effective_date, cl.expiration_date, cl.per_occurrence_cents, cl.aggregate_cents,
             cl.additional_insured, cl.waiver_of_subrogation, c.vendor_id
      from hf_coverage_lines cl
      join hf_certificates c on c.id = cl.certificate_id
      where cl.user_id = ${context.userId} and c.status = 'confirmed'`;
    const pending = await sql<{ vendor_id: string | null; n: number }>`
      select vendor_id, count(*)::int as n from hf_certificates
      where user_id = ${context.userId} and status = 'needs_review'
      group by vendor_id`;
    const pendingMap = new Map(pending.map((p) => [p.vendor_id, p.n]));
    const requirements = reqs.map(mapReq);
    const scored = vendors.map((v) =>
      computeVendor({
        vendorId: v.id,
        vendorName: v.name,
        requirements,
        coverage: cov.filter((c) => c.vendor_id === v.id).map(mapCov),
        pendingReview: pendingMap.get(v.id) ?? 0,
      }),
    );
    scored.sort((a, b) => SEVERITY[b.status] - SEVERITY[a.status] || a.vendorName.localeCompare(b.vendorName));
    const counts = { compliant: 0, expiring: 0, expired: 0, missing: 0, insufficient: 0 };
    for (const s of scored) counts[s.status] += 1;
    const alerts = scored
      .filter((s) => s.status !== "compliant")
      .map((s) => ({ vendor: s.vendorName, status: s.status, summary: s.summary }));
    return { vendors: scored, counts, alerts, vendorCount: vendors.length };
  });

export const seedSampleJob = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ensureOrg(sql, context.userId);
    const existing = await sql<{ id: string }>`
      select id from hf_vendors where user_id = ${context.userId} and name = ${"Iron Ridge Electric"} limit 1`;
    if (existing[0]) return { vendorId: existing[0].id, reused: true };
    const vid = id();
    await sql`insert into hf_vendors (id, user_id, name, trade, contact_email)
      values (${vid}, ${context.userId}, ${"Iron Ridge Electric"}, ${"Electrical"}, ${"ops@ironridge.example"})`;
    const cid = id();
    const pdf = sampleAcordPdfBase64();
    const extraction = JSON.stringify(SAMPLE_EXTRACTION);
    await sql`insert into hf_certificates
      (id, user_id, vendor_id, status, original_filename, pdf_base64, extraction_json, confirmed_at)
      values (${cid}, ${context.userId}, ${vid}, ${"confirmed"}, ${"sample-acord.pdf"}, ${pdf}, ${extraction}, now())`;
    await sql`
      insert into hf_coverage_lines
        (id, user_id, certificate_id, coverage_type, insurer, policy_number, effective_date, expiration_date,
         per_occurrence_cents, aggregate_cents, additional_insured, waiver_of_subrogation)
      values (
        ${id()}, ${context.userId}, ${cid}, ${"general_liability"}, ${"Hartford"}, ${"GL-4419"},
        ${"2025-01-01"}, ${"2026-01-01"}, ${100000000}, ${200000000}, ${true}, ${false}
      )`;
    await audit(sql, context.userId, "demo.seed", "Iron Ridge Electric sample COI (expired GL + PDF)");
    return { vendorId: vid, reused: false };
  });

export const listVendors = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ensureOrg(sql, context.userId);
    return sql<{ id: string; name: string; trade: string | null; contact_email: string | null; active: boolean }>`
      select id, name, trade, contact_email, active from hf_vendors
      where user_id = ${context.userId} order by active desc, name`;
  });

export const saveVendor = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id?: string; name: string; trade?: string; contactEmail?: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureOrg(sql, context.userId);
    const name = data.name.trim();
    if (!name) throw new Error("Name is required");
    if (data.id) {
      await sql`update hf_vendors set name = ${name}, trade = ${data.trade ?? null}, contact_email = ${data.contactEmail ?? null}
        where id = ${data.id} and user_id = ${context.userId}`;
      await audit(sql, context.userId, "vendor.update", name);
      return { id: data.id };
    }
    const vid = id();
    await sql`insert into hf_vendors (id, user_id, name, trade, contact_email)
      values (${vid}, ${context.userId}, ${name}, ${data.trade ?? null}, ${data.contactEmail ?? null})`;
    await audit(sql, context.userId, "vendor.create", name);
    return { id: vid };
  });

export const listRequirements = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ensureOrg(sql, context.userId);
    const rows = await sql<ReqRow>`
      select id, coverage_type, per_occurrence_cents, aggregate_cents, requires_ai, requires_wos
      from hf_requirement_lines where user_id = ${context.userId}`;
    return rows.map(mapReq);
  });

export const saveRequirement = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: {
      id: string;
      perOccurrenceCents: number | null;
      aggregateCents: number | null;
      requiresAi: boolean;
      requiresWos: boolean;
    }) => input,
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`
      update hf_requirement_lines
      set per_occurrence_cents = ${data.perOccurrenceCents},
          aggregate_cents = ${data.aggregateCents},
          requires_ai = ${data.requiresAi},
          requires_wos = ${data.requiresWos}
      where id = ${data.id} and user_id = ${context.userId}`;
    await audit(sql, context.userId, "requirement.update", data.id);
    return { ok: true };
  });

/** Public, non-persisting OCR/extract. User-initiated only. No COI is stored. */
export const extractLive = createServerFn({ method: "POST" })
  .validator((input: { text: string; images?: string[] }) => input)
  .handler(async ({ data }) => {
    const images = (data.images ?? []).slice(0, 2);
    return extractCertificate(data.text.slice(0, 12000), images);
  });

export const ingestCertificate = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { vendorId: string; filename: string; pdfBase64: string; text: string; images?: string[] }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureOrg(sql, context.userId);
    if (data.pdfBase64.length > 2_000_000) throw new Error("PDF too large for this environment (keep under ~1.5MB)");
    const vendor = await sql<{ id: string }>`
      select id from hf_vendors where id = ${data.vendorId} and user_id = ${context.userId}`;
    if (!vendor[0]) throw new Error("Vendor not found");
    const draft = await extractCertificate(data.text, data.images ?? []);
    const cid = id();
    await sql`
      insert into hf_certificates (id, user_id, vendor_id, status, original_filename, pdf_base64, extraction_json)
      values (${cid}, ${context.userId}, ${data.vendorId}, ${"needs_review"}, ${data.filename}, ${data.pdfBase64}, ${JSON.stringify(draft)})`;
    await audit(sql, context.userId, "certificate.ingest", data.filename + " via " + draft.extractor);
    return { id: cid, extractor: draft.extractor };
  });

export const reuploadCertificate = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; filename: string; pdfBase64: string; text: string; images?: string[] }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    if (data.pdfBase64.length > 2_000_000) throw new Error("PDF too large (keep under ~1.5MB)");
    const owned = await sql<{ id: string }>`
      select id from hf_certificates where id = ${data.id} and user_id = ${context.userId}`;
    if (!owned[0]) throw new Error("Not found");
    const draft = await extractCertificate(data.text, data.images ?? []);
    await sql`delete from hf_coverage_lines where certificate_id = ${data.id} and user_id = ${context.userId}`;
    await sql`
      update hf_certificates
      set original_filename = ${data.filename},
          pdf_base64 = ${data.pdfBase64},
          extraction_json = ${JSON.stringify(draft)},
          status = ${"needs_review"},
          confirmed_at = null,
          error_message = null
      where id = ${data.id} and user_id = ${context.userId}`;
    await audit(sql, context.userId, "certificate.reupload", data.filename + " via " + draft.extractor);
    return { id: data.id, extractor: draft.extractor, draft };
  });

export const listCertificates = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    return sql<{
      id: string;
      vendor_id: string | null;
      status: string;
      original_filename: string | null;
      created_at: string;
      vendor_name: string | null;
    }>`
      select c.id, c.vendor_id, c.status, c.original_filename, c.created_at::text, v.name as vendor_name
      from hf_certificates c
      left join hf_vendors v on v.id = c.vendor_id
      where c.user_id = ${context.userId}
      order by c.created_at desc`;
  });

export const getCertificate = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      vendor_id: string | null;
      status: string;
      original_filename: string | null;
      pdf_base64: string | null;
      extraction_json: string | null;
      error_message: string | null;
    }>`
      select id, vendor_id, status, original_filename, pdf_base64, extraction_json, error_message
      from hf_certificates where id = ${data.id} and user_id = ${context.userId}`;
    const cert = rows[0];
    if (!cert) throw new Error("Not found");
    let draft: ExtractedDraft | null = null;
    if (cert.extraction_json) {
      try {
        draft = JSON.parse(cert.extraction_json) as ExtractedDraft;
      } catch {
        draft = null;
      }
    }
    if (!draft || !draft.lines.length) {
      const cov = await sql<CovRow>`
        select * from hf_coverage_lines where certificate_id = ${data.id} and user_id = ${context.userId}`;
      if (cov.length) {
        draft = {
          extractor: draft?.extractor ?? "stored-lines",
          namedInsured: draft?.namedInsured ?? null,
          certificateHolder: draft?.certificateHolder ?? null,
          producerName: draft?.producerName ?? null,
          producerEmail: draft?.producerEmail ?? null,
          lines: cov.map((c) => ({
            coverageType: c.coverage_type as ExtractedDraft["lines"][0]["coverageType"],
            insurer: c.insurer,
            policyNumber: c.policy_number,
            effectiveDate: c.effective_date,
            expirationDate: c.expiration_date,
            perOccurrenceCents: c.per_occurrence_cents,
            aggregateCents: c.aggregate_cents,
            additionalInsured: c.additional_insured,
            waiverOfSubrogation: c.waiver_of_subrogation,
            confidence: 1,
          })),
        };
      }
    }
    return { ...cert, draft };
  });

export const confirmCertificate = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; draft: ExtractedDraft }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const owned = await sql<{ id: string }>`
      select id from hf_certificates where id = ${data.id} and user_id = ${context.userId}`;
    if (!owned[0]) throw new Error("Not found");
    await sql`delete from hf_coverage_lines where certificate_id = ${data.id} and user_id = ${context.userId}`;
    for (const line of data.draft.lines) {
      if (line.coverageType === "unknown") continue;
      await sql`
        insert into hf_coverage_lines
          (id, user_id, certificate_id, coverage_type, insurer, policy_number, effective_date, expiration_date,
           per_occurrence_cents, aggregate_cents, additional_insured, waiver_of_subrogation)
        values (
          ${id()}, ${context.userId}, ${data.id}, ${line.coverageType}, ${line.insurer}, ${line.policyNumber},
          ${line.effectiveDate}, ${line.expirationDate}, ${line.perOccurrenceCents}, ${line.aggregateCents},
          ${line.additionalInsured}, ${line.waiverOfSubrogation}
        )`;
    }
    await sql`
      update hf_certificates
      set status = ${"confirmed"}, confirmed_at = now(), extraction_json = ${JSON.stringify(data.draft)}
      where id = ${data.id} and user_id = ${context.userId}`;
    await audit(sql, context.userId, "certificate.confirm", data.id);
    return { ok: true };
  });

export const listAudit = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    return sql<{ id: string; action: string; detail: string | null; created_at: string }>`
      select id, action, detail, created_at::text from hf_audit
      where user_id = ${context.userId} order by created_at desc limit 80`;
  });

export const startTrial = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ensureOrg(sql, context.userId);
    await sql`update hf_orgs set billing_status = ${"trialing"}, plan = ${"starter"} where user_id = ${context.userId}`;
    await audit(sql, context.userId, "billing.trial", "Starter trial (sandbox simulator — not live Stripe)");
    return { ok: true };
  });

export const deleteAllData = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { confirm: string }) => input)
  .handler(async ({ context, data }) => {
    if (data.confirm !== "DELETE") throw new Error("Type DELETE to confirm");
    const sql = await getSql();
    await sql`delete from hf_coverage_lines where user_id = ${context.userId}`;
    await sql`delete from hf_certificates where user_id = ${context.userId}`;
    await sql`delete from hf_vendors where user_id = ${context.userId}`;
    await sql`delete from hf_requirement_lines where user_id = ${context.userId}`;
    await sql`delete from hf_audit where user_id = ${context.userId}`;
    await sql`delete from hf_orgs where user_id = ${context.userId}`;
    return { ok: true };
  });

export const exportCsv = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ensureOrg(sql, context.userId);
    const vendors = await sql<{ id: string; name: string }>`
      select id, name from hf_vendors where user_id = ${context.userId} and active = true`;
    const reqs = await sql<ReqRow>`
      select id, coverage_type, per_occurrence_cents, aggregate_cents, requires_ai, requires_wos
      from hf_requirement_lines where user_id = ${context.userId}`;
    const cov = await sql<CovRow>`select * from hf_coverage_lines where user_id = ${context.userId}`;
    const certs = await sql<{ id: string; vendor_id: string | null; status: string }>`
      select id, vendor_id, status from hf_certificates where user_id = ${context.userId} and status = 'confirmed'`;
    const certToVendor = new Map(certs.map((c) => [c.id, c.vendor_id]));
    const requirements = reqs.map(mapReq);
    const coverage = cov.map(mapCov);
    const rows = ["vendor,status,summary"];
    for (const v of vendors) {
      const r = computeVendor({
        vendorId: v.id,
        vendorName: v.name,
        requirements,
        coverage: coverage.filter((c) => certToVendor.get(c.certificateId) === v.id),
      });
      rows.push(`"${v.name.replace(/"/g, '""')}",${r.status},"${r.summary.replace(/"/g, '""')}"`);
    }
    return { csv: rows.join("\n") };
  });

/** Point-in-time evidence pack. Status is recomputed, never read from a stored checkbox. */
export const evidencePack = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ensureOrg(sql, context.userId);
    const asOf = new Date().toISOString();
    const vendors = await sql<{ id: string; name: string; trade: string | null }>`
      select id, name, trade from hf_vendors where user_id = ${context.userId} and active = true order by name`;
    const reqs = await sql<ReqRow>`
      select id, coverage_type, per_occurrence_cents, aggregate_cents, requires_ai, requires_wos
      from hf_requirement_lines where user_id = ${context.userId}`;
    const cov = await sql<CovRow>`select * from hf_coverage_lines where user_id = ${context.userId}`;
    const certs = await sql<{ id: string; vendor_id: string | null; status: string; original_filename: string | null }>`
      select id, vendor_id, status, original_filename from hf_certificates
      where user_id = ${context.userId} and status = 'confirmed'`;
    const certToVendor = new Map(certs.map((c) => [c.id, c.vendor_id]));
    const requirements = reqs.map(mapReq);
    const coverage = cov.map(mapCov);
    const book = vendors.map((v) => {
      const r = computeVendor({
        vendorId: v.id,
        vendorName: v.name,
        requirements,
        coverage: coverage.filter((c) => certToVendor.get(c.certificateId) === v.id),
      });
      return {
        vendor: v.name,
        trade: v.trade,
        gate: r.gate,
        status: r.status,
        clockDays: r.clockDays,
        summary: r.summary,
        lines: r.lines,
        certificates: certs.filter((c) => c.vendor_id === v.id).map((c) => c.original_filename),
      };
    });
    await audit(sql, context.userId, "pack.export", "Evidence pack as-of " + asOf);
    return {
      asOf,
      kernel: "Status is derived from confirmed coverage × your standards. A typed 'compliant' cell is void.",
      dispatchRule: "CLEAR only if every required line is in force. WATCH inside 30 days. HOLD otherwise. Do not send a HOLD sub to the job or the gate.",
      vendors: book,
    };
  });
