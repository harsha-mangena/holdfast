import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { humanBoard } from "./errors";
import { getSql } from "@/lib/db";
import { computeVendor } from "./compliance";
import {
  bidCall,
  extractInvite,
  liveJobs,
  tradeCoverage,
  buildCalendar,
} from "./precon";
import type { CoverageLine, CoverageType, RequirementLine } from "./types";

function id(): string {
  return crypto.randomUUID();
}

async function audit(sql: Awaited<ReturnType<typeof getSql>>, userId: string, action: string, detail: string) {
  await sql`insert into hf_audit (id, user_id, action, detail) values (${id()}, ${userId}, ${action}, ${detail})`;
}

async function ensureJobsTable(sql: Awaited<ReturnType<typeof getSql>>) {
  await sql.query(`
    create table if not exists hf_jobs (
      id text primary key,
      user_id text not null,
      name text not null,
      owner_name text,
      location text,
      start_date text,
      bid_due text,
      completion_date text,
      bond_required boolean not null default false,
      prevailing_wage boolean not null default false,
      trades text not null default '',
      notes text,
      source text not null default 'manual',
      created_at timestamptz not null default now()
    )`);
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

type JobDb = {
  id: string;
  name: string;
  owner_name: string | null;
  location: string | null;
  start_date: string | null;
  bid_due: string | null;
  completion_date: string | null;
  bond_required: boolean;
  prevailing_wage: boolean;
  trades: string;
  notes: string | null;
  source: string;
  created_at: string;
};

async function scoredBoard(sql: Awaited<ReturnType<typeof getSql>>, userId: string) {
  const vendors = await sql<{ id: string; name: string; trade: string | null }>`
    select id, name, trade from hf_vendors where user_id = ${userId} and active = true`;
  const reqs = await sql<ReqRow>`
    select id, coverage_type, per_occurrence_cents, aggregate_cents, requires_ai, requires_wos
    from hf_requirement_lines where user_id = ${userId}`;
  const cov = await sql<CovRow & { vendor_id: string | null }>`
    select cl.id, cl.certificate_id, cl.coverage_type, cl.insurer, cl.policy_number,
           cl.effective_date, cl.expiration_date, cl.per_occurrence_cents, cl.aggregate_cents,
           cl.additional_insured, cl.waiver_of_subrogation, c.vendor_id
    from hf_coverage_lines cl
    join hf_certificates c on c.id = cl.certificate_id
    where cl.user_id = ${userId} and c.status = 'confirmed'`;
  const requirements = reqs.map(mapReq);
  const scored = vendors.map((v) =>
    computeVendor({
      vendorId: v.id,
      vendorName: v.name,
      requirements,
      coverage: cov.filter((c) => c.vendor_id === v.id).map(mapCov),
    }),
  );
  const coverage = tradeCoverage(
    vendors.map((v) => {
      const row = scored.find((x) => x.vendorId === v.id);
      return { trade: v.trade, gate: row?.gate ?? "hold" };
    }),
  );
  return { vendors, scored, coverage };
}

function scoreJob(row: JobDb, coverage: ReturnType<typeof tradeCoverage>) {
  const trades = row.trades.split(",").map((t) => t.trim()).filter(Boolean);
  const call = bidCall(trades, coverage);
  return {
    id: row.id,
    name: row.name,
    ownerName: row.owner_name,
    location: row.location,
    startDate: row.start_date,
    bidDue: row.bid_due,
    completionDate: row.completion_date,
    bondRequired: row.bond_required,
    prevailingWage: row.prevailing_wage,
    trades,
    notes: row.notes,
    source: row.source,
    createdAt: row.created_at,
    call: call.call,
    reason: call.reason,
    coverage: call.coverage,
  };
}

export async function seedPrecon(sql: Awaited<ReturnType<typeof getSql>>, userId: string) {
  await ensureJobsTable(sql);
  const extras: Array<{ name: string; trade: string; email: string; phone: string; glExp: string | null }> = [
    { name: "Pinnacle Steel", trade: "Steel", email: "yard@pinnacle.example", phone: "+15550170", glExp: "2026-12-31" },
    { name: "North Pour Concrete", trade: "Concrete", email: "ops@northpour.example", phone: "+15550181", glExp: "2026-09-23" },
    { name: "Harbor HVAC", trade: "HVAC", email: "shop@harborhvac.example", phone: "+15550192", glExp: null },
  ];
  for (const e of extras) {
    const have = await sql<{ id: string }>`select id from hf_vendors where user_id = ${userId} and name = ${e.name} limit 1`;
    if (have[0]) continue;
    const sid = id();
    await sql`insert into hf_vendors (id, user_id, name, trade, contact_email, phone)
      values (${sid}, ${userId}, ${e.name}, ${e.trade}, ${e.email}, ${e.phone})`;
    if (!e.glExp) continue;
    const cid = id();
    await sql`insert into hf_certificates (id, user_id, vendor_id, status, original_filename, confirmed_at)
      values (${cid}, ${userId}, ${sid}, ${"confirmed"}, ${e.name + ".pdf"}, now())`;
    await sql`
      insert into hf_coverage_lines
        (id, user_id, certificate_id, coverage_type, insurer, policy_number, effective_date, expiration_date,
         per_occurrence_cents, aggregate_cents, additional_insured, waiver_of_subrogation)
      values (
        ${id()}, ${userId}, ${cid}, ${"general_liability"}, ${"Travelers"}, ${"GL-" + e.name.slice(0, 4).toUpperCase()},
        ${"2026-01-01"}, ${e.glExp}, ${100000000}, ${200000000}, ${true}, ${true}
      )`;
  }
  const jobs = await sql<{ n: number }>`select count(*)::int as n from hf_jobs where user_id = ${userId}`;
  if (!jobs[0]?.n) {
    for (const j of liveJobs()) {
      await sql`insert into hf_jobs
        (id, user_id, name, owner_name, location, start_date, bid_due, completion_date, bond_required, prevailing_wage, trades, notes, source)
        values (
          ${id()}, ${userId}, ${j.name}, ${j.ownerName}, ${j.location}, ${j.startDate}, ${j.bidDue},
          ${j.completionDate}, ${j.bondRequired}, ${j.prevailingWage}, ${j.trades.join(", ")}, ${j.notes}, ${"sample"}
        )`;
    }
  }
}

export const seedPreconJobs = createServerFn({ method: "POST" })
  .middleware([authMiddleware, humanBoard])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await seedPrecon(sql, context.userId);
    return { ok: true };
  });

export const listJobs = createServerFn({ method: "GET" })
  .middleware([authMiddleware, humanBoard])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ensureJobsTable(sql);
    const { coverage } = await scoredBoard(sql, context.userId);
    const rows = await sql<JobDb>`
      select id, name, owner_name, location, start_date, bid_due, completion_date, bond_required,
             prevailing_wage, trades, notes, source, created_at::text
      from hf_jobs where user_id = ${context.userId} order by coalesce(bid_due, start_date, '9999')`;
    return rows.map((r) => scoreJob(r, coverage));
  });

export const ingestInvite = createServerFn({ method: "POST" })
  .middleware([authMiddleware, humanBoard])
  .validator((input: { text: string }) => input)
  .handler(async ({ context, data }) => {
    const text = data.text.trim();
    if (text.length < 12) throw new Error("Paste the invitation. A subject line is not enough.");
    const sql = await getSql();
    await ensureJobsTable(sql);
    let draft = extractInvite(text);
    const apiKey = process.env.XAI_API_KEY;
    if (apiKey && text.length > 40) {
      try {
        const res = await fetch("https://api.x.ai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
          body: JSON.stringify({
            model: "grok-4.5",
            max_tokens: 400,
            temperature: 0,
            messages: [
              {
                role: "system",
                content:
                  "Extract a construction ITB as JSON keys: name, ownerName, location, startDate, bidDue, completionDate (ISO dates or null), bondRequired, prevailingWage, trades (string array), notes. No markdown.",
              },
              { role: "user", content: text.slice(0, 6000) },
            ],
          }),
        });
        if (res.ok) {
          const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
          const raw = body.choices?.[0]?.message?.content ?? "";
          const json = raw.match(/\{[\s\S]*\}/)?.[0];
          if (json) {
            const parsed = JSON.parse(json) as Partial<typeof draft> & { trades?: string[] };
            draft = {
              name: parsed.name || draft.name,
              ownerName: parsed.ownerName ?? draft.ownerName,
              location: parsed.location ?? draft.location,
              startDate: parsed.startDate ?? draft.startDate,
              bidDue: parsed.bidDue ?? draft.bidDue,
              completionDate: parsed.completionDate ?? draft.completionDate,
              bondRequired: Boolean(parsed.bondRequired ?? draft.bondRequired),
              prevailingWage: Boolean(parsed.prevailingWage ?? draft.prevailingWage),
              trades: (parsed.trades?.length ? parsed.trades : draft.trades).map(String),
              notes: parsed.notes ?? draft.notes,
            };
          }
        }
      } catch {
        /* local extract stands */
      }
    }
    const jid = id();
    await sql`insert into hf_jobs
      (id, user_id, name, owner_name, location, start_date, bid_due, completion_date, bond_required, prevailing_wage, trades, notes, source)
      values (
        ${jid}, ${context.userId}, ${draft.name}, ${draft.ownerName}, ${draft.location}, ${draft.startDate},
        ${draft.bidDue}, ${draft.completionDate}, ${draft.bondRequired}, ${draft.prevailingWage},
        ${draft.trades.join(", ")}, ${draft.notes}, ${"forward"}
      )`;
    await audit(sql, context.userId, "job.ingest", draft.name);
    const { coverage } = await scoredBoard(sql, context.userId);
    return scoreJob(
      {
        id: jid,
        name: draft.name,
        owner_name: draft.ownerName,
        location: draft.location,
        start_date: draft.startDate,
        bid_due: draft.bidDue,
        completion_date: draft.completionDate,
        bond_required: draft.bondRequired,
        prevailing_wage: draft.prevailingWage,
        trades: draft.trades.join(", "),
        notes: draft.notes,
        source: "forward",
        created_at: new Date().toISOString(),
      },
      coverage,
    );
  });

export const listCalendar = createServerFn({ method: "GET" })
  .middleware([authMiddleware, humanBoard])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ensureJobsTable(sql);
    const jobs = await sql<{ id: string; name: string; bid_due: string | null; start_date: string | null; completion_date: string | null }>`
      select id, name, bid_due, start_date, completion_date from hf_jobs where user_id = ${context.userId}`;
    const cov = await sql<{ vendor: string; date: string; line: string }>`
      select v.name as vendor, cl.expiration_date as date, cl.coverage_type as line
      from hf_coverage_lines cl
      join hf_certificates c on c.id = cl.certificate_id
      join hf_vendors v on v.id = c.vendor_id
      where cl.user_id = ${context.userId} and c.status = 'confirmed' and cl.expiration_date is not null`;
    const pay = await sql<{ vendor: string; date: string; memo: string | null }>`
      select v.name as vendor, coalesce(p.doc_date, p.created_at::date::text) as date, p.memo
      from hf_pay_lines p join hf_vendors v on v.id = p.vendor_id
      where p.user_id = ${context.userId}`;
    return buildCalendar({
      jobs: jobs.map((j) => ({ id: j.id, name: j.name, bidDue: j.bid_due, startDate: j.start_date, completionDate: j.completion_date })),
      expiries: cov.map((c) => ({ vendor: c.vendor, date: c.date, line: c.line.replaceAll("_", " ") })),
      pay: pay.filter((p) => p.date).map((p) => ({ vendor: p.vendor, date: p.date, memo: p.memo })),
    });
  });
