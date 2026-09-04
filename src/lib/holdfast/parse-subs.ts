export type DraftSub = { name: string; trade?: string; contactEmail?: string; phone?: string };

function key(h: string) {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const NAME = new Set(["name", "company", "vendor", "sub", "subcontractor", "firm", "business"]);
const TRADE = new Set(["trade", "craft", "scope", "type"]);
const EMAIL = new Set(["email", "contact", "contactemail", "mail"]);
const PHONE = new Set(["phone", "tel", "mobile", "cell", "telephone"]);

function splitCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === "," || c === "\t") {
      row.push(cell.trim());
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell.trim());
      if (row.some((x) => x)) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  row.push(cell.trim());
  if (row.some((x) => x)) rows.push(row);
  return rows;
}

export function rowsFromGrid(grid: string[][]): DraftSub[] {
  if (!grid.length) return [];
  const header = grid[0].map(key);
  const ni = header.findIndex((h) => NAME.has(h));
  const nameIdx = ni >= 0 ? ni : 0;
  const tradeIdx = header.findIndex((h) => TRADE.has(h));
  const emailIdx = header.findIndex((h) => EMAIL.has(h));
  const phoneIdx = header.findIndex((h) => PHONE.has(h));
  const out: DraftSub[] = [];
  for (const r of grid.slice(1)) {
    const name = (r[nameIdx] ?? "").trim();
    if (!name || NAME.has(key(name))) continue;
    out.push({
      name,
      trade: tradeIdx >= 0 ? r[tradeIdx]?.trim() || undefined : undefined,
      contactEmail: emailIdx >= 0 ? r[emailIdx]?.trim() || undefined : undefined,
      phone: phoneIdx >= 0 ? r[phoneIdx]?.trim() || undefined : undefined,
    });
  }
  return out;
}

export function parseCsvText(text: string): DraftSub[] {
  return rowsFromGrid(splitCsv(text));
}

export async function parseSubFile(file: File): Promise<DraftSub[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const XLSX = await import("xlsx");
    const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    if (!sheet) return [];
    const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false }) as string[][];
    return rowsFromGrid(grid.map((r) => r.map((c) => String(c ?? ""))));
  }
  return parseCsvText(await file.text());
}

export const SUB_TEMPLATE =
  "company,trade,email,phone\nIron Ridge Electric,Electrical,ops@ironridge.example,+15550144\nApex Concrete,Concrete,office@apex.example,+15550155\n";
