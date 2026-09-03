# Holdfast

**Derived-status certificates of insurance for general contractors and property managers.**

An expired GL on a job is an uninsured claim. Most shops still run that in a spreadsheet and type the word *compliant* into a cell. Holdfast refuses that cell.

Status is not stored. It is computed from:

1. the original ACORD PDF (immutable evidence)
2. coverage lines a human confirmed
3. this company’s standards (limits, additional insured, waiver of subrogation)
4. today’s date

A typed “compliant” is void. The document is the only evidence.

Live product: this repo. GitHub: [harsha-mangena/holdfast](https://github.com/harsha-mangena/holdfast).

---

## Who it is for

Small and mid GCs / PMs who:

- collect ACORD 25s from subs over email
- need to know **who can go through the fence at 6am**
- get burned when a GL lapses mid-job and nobody noticed

It is **not** an insurance marketplace. We do not sell coverage. We do not auto-file a certificate as “verified.” Confirm is mandatory.

---

## What you can do

| Surface | Job |
| --- | --- |
| Public landing + demo | Run Iron Ridge (expired GL) with **no account**. Sign-in only when you want the board kept overnight. |
| Board | Derived counts + **Dispatch CLEAR / WATCH / HOLD** + days on the clock. Sentence: *N cannot enter the job today.* |
| Subs | Vendor roll. **Ask for COI** opens a mailto with the required coverages. |
| Certs | Upload PDF → vision + text extract → human confirm → coverage lines written. Re-upload replaces the file and re-reads. |
| Standards | Default GC template: GL $1M / $2M, AI + WOS, WC statutory. Editable. |
| Account | Who is signed in, company name on the evidence pack, gate snapshot, sign out. |
| Office | Evidence pack (JSON, recomputed at click), CSV, audit, delete-my-data, trial simulator. |

### Dispatch gate

| Gate | When | Meaning |
| --- | --- | --- |
| **CLEAR** | every required line in force, outside 30 days | May enter the job |
| **WATCH** | otherwise-ok coverage inside 30 days of expiry | Clock is running |
| **HOLD** | expired, missing, or insufficient | Do not dispatch |

HOLD is the product. Everything else is chrome.

### Status matrix (derived, never written)

`compliant` · `expiring` (≤30 days) · `expired` · `missing` · `insufficient` (limit / AI / WOS short)

Vendor status = worst line. `hf_certificates` stores `needs_review` / `confirmed` / `rejected` / `failed` — that is **workflow**, not compliance.

---

## How an ACORD becomes a gate

```
PDF (original, stored)
    → client: pdf.js text layer + page JPEG
    → server: grok-4.5 vision (fallback: ACORD heuristic)
    → draft on Confirm
    → human fixes dates / limits / AI / WOS
    → coverage lines written
    → computeVendor(coverage × requirements × today)
    → CLEAR / WATCH / HOLD
```

OCR is not a source of truth. Scanned faxes and shuffled ACORD columns will be wrong. Confirm exists because of that. If `XAI_API_KEY` is missing, extraction is heuristic-only.

---

## Stack

- **TanStack Start** (React 19) + Vite + Tailwind v4
- **Postgres**: Neon in production, **PGLite** in local preview
- **Better Auth**: Google, X, email/password
- **pdfjs-dist** in the browser for text + page images
- **xAI grok-4.5** multimodal for ACORD extraction

One signed-in user = one org. No team invites yet.

---

## Data model

See [`migrations/0002_holdfast.sql`](migrations/0002_holdfast.sql).

| Table | Holds |
| --- | --- |
| `hf_orgs` | company name, plan, billing_status |
| `hf_vendors` | subs |
| `hf_requirement_lines` | this GC’s standards |
| `hf_certificates` | original filename, `pdf_base64`, extraction JSON, review workflow |
| `hf_coverage_lines` | confirmed fields used by the engine |
| `hf_audit` | who did what |

There is **no** `status = compliant` column on a vendor. If you add one, you have broken the product.

---

## Routes

| Path | Auth | Purpose |
| --- | --- | --- |
| `/` | public | Landing, demo, pricing, why |
| `/login` | public | Google / X / email |
| `/privacy` `/terms` | public | Legal |
| `/app` | signed in | Board |
| `/app/vendors` | signed in | Subs |
| `/app/certificates` | signed in | Ingest + list |
| `/app/certificates/$id` | signed in | Confirm / re-upload |
| `/app/requirements` | signed in | Standards |
| `/app/account` | signed in | Profile |
| `/app/settings` | signed in | Office |

Public extract: `extractLive` (no persist). Authenticated ingest stores the PDF.

---

## Run locally

```bash
npm install
npm run dev          # http://0.0.0.0:8080
```

Useful:

```bash
npm run typecheck
npm test
npm run build        # vite build + db migrate
```

### Environment

| Variable | Why |
| --- | --- |
| `XAI_API_KEY` | Vision extraction. Without it, heuristic only. |
| `VITE_AUTH_ENABLED` | Default on. `false` uses a local `dev-user`. |
| `DATABASE_URL` | Neon in production. Preview uses PGLite. |

Staging banner is intentional: **fake documents only**. Do not upload a real insured’s COI into a preview.

### First run after sign-up

The board will look dead until you either:

- **Load sample jobsite (expired GL)** — Iron Ridge Electric, Hartford GL-4419, exp 2026-01-01, with a real (sample) PDF
- or add a sub and upload an ACORD

The landing demo does **not** write to your account. “Watch this overnight” is when we ask you to sign in.

---

## What is not done (on purpose)

- No Procore / Vista / Sage sync
- No magic-link sub portal (subs still email; **Ask for COI** is mailto)
- SMTP overnight alerts are simulated on the board (“would email today”)
- Stripe is a local trial flip, not a live charge
- PDF storage is `pdf_base64` on the row — fine for staging, not a file pipeline
- Solo-user orgs only

Jones, Billy, illumend, Certificial already exist. Holdfast’s wedge is the gate and the refusal to type status — not a longer feature list.

---

## Sister desk

[Laytime](https://github.com/harsha-mangena/laytime) is the same refusal on ocean freight: OSRA / 46 CFR 541 invoices, 30-day dispute clock. Do not merge the UIs. A GC does not speak detention. A 3PL does not speak additional insured. The kernel is shared; the buyer is not.

---

## License

Source in this repository is the Holdfast product codebase. No open-source license is attached yet — treat as proprietary unless a `LICENSE` file lands later.
