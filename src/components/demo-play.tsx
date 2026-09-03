import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { extractLive, seedSampleJob } from "@/lib/holdfast/actions";
import { computeVendor } from "@/lib/holdfast/compliance";
import { DEFAULT_REQUIREMENTS, type ExtractedDraft } from "@/lib/holdfast/types";
import { AuthModal } from "@/components/auth-modal";
import { Button, StatusChip } from "@/components/ui-kit";
import { StepDots } from "@/components/flow-dots";

const SAMPLE: ExtractedDraft = {
  extractor: "demo",
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
      confidence: 0.92,
    },
  ],
};

const reqs = DEFAULT_REQUIREMENTS.map((r, i) => ({ ...r, id: "r" + i }));

export function DemoPlay() {
  const nav = useNavigate();
  const [step, setStep] = useState<"idle" | "read" | "review" | "board">("idle");
  const [draft, setDraft] = useState<ExtractedDraft>(SAMPLE);
  const [modal, setModal] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const result = computeVendor({
    vendorId: "demo",
    vendorName: draft.namedInsured || "Iron Ridge Electric",
    requirements: reqs,
    coverage: draft.lines.map((l, i) => ({
      id: "c" + i,
      certificateId: "demo",
      coverageType: l.coverageType === "unknown" ? "other" : l.coverageType,
      insurer: l.insurer,
      policyNumber: l.policyNumber,
      effectiveDate: l.effectiveDate,
      expirationDate: l.expirationDate,
      perOccurrenceCents: l.perOccurrenceCents,
      aggregateCents: l.aggregateCents,
      additionalInsured: l.additionalInsured,
      waiverOfSubrogation: l.waiverOfSubrogation,
    })),
  });

  function afterAuth() {
    void seedSampleJob()
      .catch(() => undefined)
      .finally(() => void nav({ to: "/app" }));
  }

  async function runSample() {
    setErr("");
    setStep("read");
    await new Promise((r) => setTimeout(r, 700));
    setDraft(SAMPLE);
    setStep("review");
  }

  async function runUpload(file: File) {
    setErr("");
    setBusy(true);
    setStep("read");
    try {
      const { pdfToEvidence } = await import("@/lib/holdfast/pdf-text");
      const evidence = await pdfToEvidence(await file.arrayBuffer());
      const extracted = await extractLive({ data: { text: evidence.text, images: evidence.images } });
      setDraft(extracted.lines.length ? extracted : SAMPLE);
      setStep("review");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not read that PDF");
      setStep("idle");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="demo" className="scroll-mt-20 border border-border bg-surface p-4 sm:p-8">
      <p className="text-[11px] uppercase tracking-[0.22em] text-primary">No account required</p>
      <h2 className="mt-1 font-display text-3xl sm:text-4xl">Ninety seconds. Then we ask.</h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
        Run a real jobsite. See an expired GL. Feel the miss. We only ask you to sign in when you want
        overnight watch — because a demo cannot email you in 30 days.
      </p>
      <StepDots steps={["idle", "read", "review", "board"]} current={step} />

      {step === "idle" ? (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button onClick={() => void runSample()} className="min-h-12">
            Run the sample jobsite
          </Button>
          <label className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-md border border-border px-4 text-sm font-semibold">
            Try a fake PDF (vision OCR)
            <input
              type="file"
              accept="application/pdf"
              className="sr-only"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void runUpload(f);
              }}
            />
          </label>
        </div>
      ) : null}

      {err ? <p className="mt-3 text-sm text-bad">{err}</p> : null}

      {step === "read" ? (
        <p className="mt-8 font-display text-2xl text-primary">Reading the ACORD — text layer and page image…</p>
      ) : null}

      {step === "review" ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="bg-paper p-4 text-ink">
            <div className="text-[11px] uppercase tracking-wider">ACORD 25 · sample</div>
            <div className="mt-3 font-display text-2xl">{draft.namedInsured}</div>
            <div className="text-sm">Holder: {draft.certificateHolder || "—"}</div>
            {draft.lines.map((l, i) => (
              <div key={i} className="mt-3 border-t border-ink/20 pt-3 text-sm">
                {l.coverageType} · {l.insurer} · exp {l.expirationDate}
              </div>
            ))}
          </div>
          <div>
            <p className="text-sm text-muted">Human confirm. We never auto-accept an expiration date.</p>
            <Button className="mt-4 min-h-12" onClick={() => setStep("board")}>
              Confirm — derive status
            </Button>
          </div>
        </div>
      ) : null}

      {step === "board" ? (
        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border border-bad/50 bg-raised p-4">
            <div>
              <div className="font-medium">{result.vendorName}</div>
              <div className="text-sm text-muted">{result.summary}</div>
            </div>
            <StatusChip status={result.status} />
          </div>
          <p className="text-sm text-muted">
            That miss is already in the past. Spreadsheets will not email you next time. Holdfast will — after
            you keep the board.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              className="min-h-12"
              onClick={() =>
                setModal(
                  "Overnight alerts and a saved board require an account. The demo cannot watch this sub after you close the tab.",
                )
              }
            >
              Watch this overnight
            </Button>
            <Button
              tone="ghost"
              className="min-h-12"
              onClick={() => {
                setStep("idle");
                setDraft(SAMPLE);
                setErr("");
              }}
            >
              Run it again
            </Button>
          </div>
        </div>
      ) : null}

      <AuthModal open={Boolean(modal)} reason={modal ?? ""} onClose={() => setModal(null)} onAuthed={afterAuth} />
    </section>
  );
}
