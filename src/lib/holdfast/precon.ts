import type { VendorResult } from "./compliance";

export type BidCall = "bid" | "hold-scope" | "no-bid";
export type CoverageBand = "low" | "medium" | "high";

export interface InviteDraft {
  name: string;
  ownerName: string | null;
  location: string | null;
  startDate: string | null;
  bidDue: string | null;
  completionDate: string | null;
  bondRequired: boolean;
  prevailingWage: boolean;
  trades: string[];
  notes: string | null;
}

export interface JobRow extends InviteDraft {
  id: string;
  source: string;
  createdAt: string;
  call: BidCall;
  reason: string;
  coverage: TradeCoverage[];
}

export interface TradeCoverage {
  trade: string;
  total: number;
  clear: number;
  watch: number;
  hold: number;
  band: CoverageBand;
}

export interface CalendarEvent {
  id: string;
  date: string;
  kind: "bid" | "start" | "coi" | "pay" | "complete";
  title: string;
  detail: string;
  tone: "ok" | "warn" | "bad" | "muted";
}

const TRADE_ALIASES: Record<string, string> = {
  electrical: "Electrical",
  electrician: "Electrical",
  electric: "Electrical",
  hvac: "HVAC",
  mechanical: "HVAC",
  plumbing: "Plumbing",
  plumber: "Plumbing",
  concrete: "Concrete",
  steel: "Steel",
  structural: "Steel",
  roofing: "Roofing",
  roof: "Roofing",
  drywall: "Drywall",
  paint: "Paint",
  painting: "Paint",
  fire: "Fire protection",
  sprinkler: "Fire protection",
};

export function normalizeTrade(raw: string | null | undefined): string {
  const t = (raw ?? "").trim();
  if (!t) return "General";
  const hit = TRADE_ALIASES[t.toLowerCase()];
  return hit ?? t.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function coverageBand(clear: number, total: number): CoverageBand {
  if (total === 0 || clear === 0) return "low";
  const r = clear / total;
  if (r >= 0.67) return "high";
  if (r >= 0.34) return "medium";
  return "low";
}

export function tradeCoverage(vendors: Array<{ trade: string | null; gate: VendorResult["gate"] }>): TradeCoverage[] {
  const map = new Map<string, TradeCoverage>();
  for (const v of vendors) {
    const trade = normalizeTrade(v.trade);
    const cur = map.get(trade) ?? { trade, total: 0, clear: 0, watch: 0, hold: 0, band: "low" as CoverageBand };
    cur.total += 1;
    if (v.gate === "clear") cur.clear += 1;
    else if (v.gate === "watch") cur.watch += 1;
    else cur.hold += 1;
    cur.band = coverageBand(cur.clear, cur.total);
    map.set(trade, cur);
  }
  return [...map.values()].sort((a, b) => a.trade.localeCompare(b.trade));
}

export function bidCall(trades: string[], coverage: TradeCoverage[]): { call: BidCall; reason: string; coverage: TradeCoverage[] } {
  const needed = trades.length ? trades.map(normalizeTrade) : coverage.map((c) => c.trade);
  const slice = needed.map((t) => coverage.find((c) => c.trade === t) ?? { trade: t, total: 0, clear: 0, watch: 0, hold: 0, band: "low" as CoverageBand });
  const empty = slice.filter((c) => c.total === 0);
  const hold = slice.filter((c) => c.hold > 0 && c.clear === 0);
  const watch = slice.filter((c) => c.watch > 0 && c.clear === 0 && c.hold === 0);
  if (empty.length && empty.length === slice.length) {
    return { call: "no-bid", reason: "No crews on the board for " + empty.map((c) => c.trade).join(", ") + ".", coverage: slice };
  }
  if (empty.length) {
    return { call: "hold-scope", reason: "No paper in " + empty.map((c) => c.trade).join(", ") + ". Bid the rest, HOLD that scope.", coverage: slice };
  }
  if (hold.length) {
    return { call: "hold-scope", reason: hold.map((c) => c.trade).join(", ") + " is HOLD. Do not send them. Bid the CLEAR trades.", coverage: slice };
  }
  if (watch.length) {
    return { call: "bid", reason: "Bid. " + watch.map((c) => c.trade).join(", ") + " is on the 30-day clock.", coverage: slice };
  }
  return { call: "bid", reason: "Every trade on this invite has a CLEAR crew.", coverage: slice };
}

const ISO = /\b(20\d{2}-\d{2}-\d{2})\b/;
const US = /\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/;

function toIso(chunk: string): string | null {
  const iso = chunk.match(ISO);
  if (iso) return iso[1];
  const us = chunk.match(US);
  if (!us) return null;
  const m = us[1].padStart(2, "0");
  const d = us[2].padStart(2, "0");
  return `${us[3]}-${m}-${d}`;
}

function nearDate(text: string, keys: RegExp): string | null {
  const lines = text.split(/\n+/);
  for (const line of lines) {
    if (keys.test(line)) {
      const d = toIso(line);
      if (d) return d;
    }
  }
  return toIso(text);
}

export function extractInvite(text: string): InviteDraft {
  const raw = text.replace(/\r/g, "").trim();
  const first = raw.split("\n").map((l) => l.trim()).find((l) => l.length > 4) ?? "Untitled job";
  const name = first.replace(/^(itb|invitation to bid|re:|fwd:)\s*[:\-]?\s*/i, "").slice(0, 80);
  const owner = raw.match(/\bowner[:\s]+([^\n]+)/i)?.[1]?.trim() ?? raw.match(/\b(usd|district|hospital|university|city of [^\n,]+)/i)?.[0] ?? null;
  const loc = raw.match(/\blocation[:\s]+([^\n]+)/i)?.[1]?.trim() ?? raw.match(/\b([A-Z][a-z]+,\s*[A-Z]{2})\b/)?.[1] ?? null;
  const trades = [...new Set(
    Object.keys(TRADE_ALIASES)
      .filter((k) => new RegExp("\\b" + k + "\\b", "i").test(raw))
      .map((k) => TRADE_ALIASES[k]),
  )];
  return {
    name: name || "Untitled job",
    ownerName: owner ? owner.slice(0, 80) : null,
    location: loc ? loc.slice(0, 80) : null,
    startDate: nearDate(raw, /start|ntp|mobilize/i),
    bidDue: nearDate(raw, /bid due|due date|proposals due|itb due/i),
    completionDate: nearDate(raw, /complet|substantial/i),
    bondRequired: /bond/i.test(raw),
    prevailingWage: /prevailing|davis[- ]bacon|pw\b/i.test(raw),
    trades,
    notes: raw.slice(0, 1200),
  };
}

export const SAMPLE_ITB = `INVITATION TO BID — Northfork School Addition
Owner: Northfork USD
Location: Northfork, TX
Bid due: 2026-09-18
Start / NTP: 2026-10-06
Substantial completion: 2027-06-30
Bond required. Prevailing wage.
Trades: Electrical, HVAC, Concrete, Steel.
GC coverage is thin in HVAC. Additional insured + WOS on GL.`;

export const LIVE_CREWS: Array<{ name: string; trade: string; gate: VendorResult["gate"]; remaining: number; why: string; days: number | null }> = [
  { name: "Iron Ridge Electric", trade: "Electrical", gate: "hold", remaining: 1_250_000, why: "GL expired 246 days ago", days: -246 },
  { name: "Pinnacle Steel", trade: "Steel", gate: "clear", remaining: 0, why: "Required coverage in force", days: 118 },
  { name: "North Pour Concrete", trade: "Concrete", gate: "watch", remaining: 420_000, why: "GL expires in 18 days", days: 18 },
  { name: "Harbor HVAC", trade: "HVAC", gate: "hold", remaining: 0, why: "No paper on file", days: null },
  { name: "Redline Roofing", trade: "Roofing", gate: "hold", remaining: 88_000, why: "Workers' comp missing", days: null },
  { name: "Westfork Plumbing", trade: "Plumbing", gate: "clear", remaining: 0, why: "Required coverage in force", days: 210 },
  { name: "Summit Drywall", trade: "Drywall", gate: "watch", remaining: 61_000, why: "Auto expires in 9 days", days: 9 },
];

export function liveJobs(): JobRow[] {
  const cov = tradeCoverage(LIVE_CREWS);
  const rows: InviteDraft[] = [
    {
      name: "Northfork School Addition",
      ownerName: "Northfork USD",
      location: "Northfork, TX",
      startDate: "2026-10-06",
      bidDue: "2026-09-18",
      completionDate: "2027-06-30",
      bondRequired: true,
      prevailingWage: true,
      trades: ["Electrical", "HVAC", "Concrete", "Steel"],
      notes: SAMPLE_ITB,
    },
    {
      name: "Iron Ridge Tower",
      ownerName: "Ridge Partners",
      location: "Austin, TX",
      startDate: "2026-09-22",
      bidDue: "2026-09-08",
      completionDate: "2026-12-15",
      bondRequired: true,
      prevailingWage: false,
      trades: ["Electrical", "Steel"],
      notes: "Pay app 14 still open on Iron Ridge Electric.",
    },
    {
      name: "Pinnacle Medical",
      ownerName: "Pinnacle Health",
      location: "Dallas, TX",
      startDate: "2026-11-02",
      bidDue: "2026-09-28",
      completionDate: "2027-08-01",
      bondRequired: false,
      prevailingWage: false,
      trades: ["Steel", "Plumbing"],
      notes: "Owner-furnished imaging equipment. Public liability on file.",
    },
  ];
  return rows.map((r, i) => {
    const call = bidCall(r.trades, cov);
    return {
      ...r,
      id: "live-" + (i + 1),
      source: "sample",
      createdAt: "2026-09-04T12:00:00Z",
      call: call.call,
      reason: call.reason,
      coverage: call.coverage,
    };
  });
}

export function buildCalendar(input: {
  jobs: Array<{ id: string; name: string; bidDue: string | null; startDate: string | null; completionDate: string | null }>;
  expiries: Array<{ vendor: string; date: string; line: string }>;
  pay: Array<{ vendor: string; date: string; memo: string | null }>;
}): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  for (const j of input.jobs) {
    if (j.bidDue) events.push({ id: j.id + "-bid", date: j.bidDue, kind: "bid", title: j.name, detail: "Bid due", tone: "warn" });
    if (j.startDate) events.push({ id: j.id + "-start", date: j.startDate, kind: "start", title: j.name, detail: "NTP / start", tone: "ok" });
    if (j.completionDate) events.push({ id: j.id + "-done", date: j.completionDate, kind: "complete", title: j.name, detail: "Substantial completion", tone: "muted" });
  }
  for (const e of input.expiries) {
    const past = e.date < new Date().toISOString().slice(0, 10);
    events.push({
      id: "coi-" + e.vendor + e.date,
      date: e.date,
      kind: "coi",
      title: e.vendor,
      detail: e.line + (past ? " expired" : " expires"),
      tone: past ? "bad" : "warn",
    });
  }
  for (const p of input.pay) {
    events.push({ id: "pay-" + p.vendor + p.date, date: p.date, kind: "pay", title: p.vendor, detail: p.memo || "Pay app", tone: "muted" });
  }
  return events.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}

export function liveCalendar(): CalendarEvent[] {
  return buildCalendar({
    jobs: liveJobs(),
    expiries: LIVE_CREWS.filter((c) => c.days != null).map((c) => {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() + (c.days ?? 0));
      return { vendor: c.name, date: d.toISOString().slice(0, 10), line: c.why };
    }),
    pay: [{ vendor: "Iron Ridge Electric", date: "2026-09-05", memo: "Pay app 14 · $12,500" }],
  });
}
