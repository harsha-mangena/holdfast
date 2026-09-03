import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { confirmCertificate, getCertificate, reuploadCertificate } from "@/lib/holdfast/actions";
import { COVERAGE_LABELS, COVERAGE_TYPES, type ExtractedDraft } from "@/lib/holdfast/types";
import { Button, Field, Input } from "@/components/ui-kit";

const EMPTY_LINE: ExtractedDraft["lines"][0] = {
  coverageType: "general_liability",
  insurer: null,
  policyNumber: null,
  effectiveDate: null,
  expirationDate: null,
  perOccurrenceCents: null,
  aggregateCents: null,
  additionalInsured: null,
  waiverOfSubrogation: null,
  confidence: null,
};

const EMPTY_DRAFT: ExtractedDraft = {
  extractor: "manual",
  namedInsured: null,
  certificateHolder: null,
  producerName: null,
  producerEmail: null,
  lines: [{ ...EMPTY_LINE }],
};

export const Route = createFileRoute("/app/certificates_/$id")({ component: Review });

function Review() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["cert", id],
    queryFn: () => getCertificate({ data: { id } }),
  });
  const [draft, setDraft] = useState<ExtractedDraft>(EMPTY_DRAFT);
  useEffect(() => {
    if (q.data?.draft) setDraft(q.data.draft.lines.length ? q.data.draft : { ...q.data.draft, lines: EMPTY_DRAFT.lines });
  }, [q.data]);

  const save = useMutation({
    mutationFn: () => confirmCertificate({ data: { id, draft } }),
    onSuccess: () => {
      void qc.invalidateQueries();
      void nav({ to: "/app" });
    },
  });

  const reup = useMutation({
    mutationFn: async (file: File) => {
      const { fileToBase64, pdfToEvidence } = await import("@/lib/holdfast/pdf-text");
      const evidence = await pdfToEvidence(await file.arrayBuffer());
      const pdfBase64 = await fileToBase64(file);
      return reuploadCertificate({
        data: { id, filename: file.name, pdfBase64, text: evidence.text, images: evidence.images },
      });
    },
    onSuccess: (res) => {
      if (res.draft) setDraft(res.draft.lines.length ? res.draft : { ...res.draft, lines: EMPTY_DRAFT.lines });
      void qc.invalidateQueries({ queryKey: ["cert", id] });
      void qc.invalidateQueries({ queryKey: ["certs"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  if (q.isLoading) {
    return <p className="text-muted">Loading evidence…</p>;
  }
  if (q.error) {
    return (
      <div className="space-y-3">
        <p className="text-bad">{q.error instanceof Error ? q.error.message : "Could not load this certificate"}</p>
        <Link to="/app/certificates" className="text-sm text-primary">
          Back to certificates
        </Link>
      </div>
    );
  }

  const pdfSrc = q.data?.pdf_base64 ? "data:application/pdf;base64," + q.data.pdf_base64 : null;
  const ocrNote =
    draft.extractor === "empty" || draft.extractor === "manual"
      ? "Nothing was read. Re-upload the PDF — scans need the page image, not just a filename."
      : draft.extractor.includes("heuristic")
        ? "Fell back to the form labels. Check every date before you confirm."
        : draft.extractor.includes("vision")
          ? "Read from the page image plus the text layer. Still confirm — vision guesses."
          : "Machine draft. You own every date before it becomes status.";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link to="/app/certificates" className="text-sm text-muted">
            ← Certificates
          </Link>
          <h1 className="font-display text-4xl">Confirm extraction</h1>
          <p className="text-sm text-muted">
            {q.data?.original_filename} · {draft.extractor}. Fix anything wrong before it becomes status.
          </p>
        </div>
        <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-border px-4 text-sm font-semibold">
          {reup.isPending ? "Re-reading…" : "Re-upload PDF"}
          <input
            type="file"
            accept="application/pdf"
            className="sr-only"
            disabled={reup.isPending}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) reup.mutate(f);
            }}
          />
        </label>
      </div>
      {reup.error ? <p className="text-sm text-bad">{reup.error instanceof Error ? reup.error.message : "Re-upload failed"}</p> : null}
      <p className="text-sm text-muted">{ocrNote}</p>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="min-h-64 overflow-hidden border border-border bg-paper">
          {pdfSrc ? (
            <object title="Original COI" data={pdfSrc} type="application/pdf" className="h-[32rem] w-full">
              <a href={pdfSrc} className="block p-4 text-ink underline" download={q.data?.original_filename ?? "certificate.pdf"}>
                Download original PDF
              </a>
            </object>
          ) : (
            <div className="space-y-3 p-4 text-ink">
              <p>No PDF stored on this row. The sample job seeds coverage without the original file.</p>
              <p className="text-sm">Re-upload the ACORD on the right. We keep that copy as evidence and re-run the read.</p>
            </div>
          )}
        </div>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <Field label="Named insured">
            <Input value={draft.namedInsured ?? ""} onChange={(e) => setDraft({ ...draft, namedInsured: e.target.value })} />
          </Field>
          <Field label="Certificate holder">
            <Input value={draft.certificateHolder ?? ""} onChange={(e) => setDraft({ ...draft, certificateHolder: e.target.value })} />
          </Field>
          {draft.lines.map((line, i) => (
            <div key={i} className="space-y-2 border border-border p-3">
              <select
                className="min-h-11 w-full rounded-md border border-border bg-raised px-2 text-sm"
                value={line.coverageType === "unknown" ? "other" : line.coverageType}
                onChange={(e) => {
                  const lines = draft.lines.slice();
                  lines[i] = { ...line, coverageType: e.target.value as ExtractedDraft["lines"][0]["coverageType"] };
                  setDraft({ ...draft, lines });
                }}
              >
                {COVERAGE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {COVERAGE_LABELS[t]}
                  </option>
                ))}
              </select>
              <Input
                placeholder="Insurer"
                value={line.insurer ?? ""}
                onChange={(e) => {
                  const lines = draft.lines.slice();
                  lines[i] = { ...line, insurer: e.target.value };
                  setDraft({ ...draft, lines });
                }}
              />
              <Input
                placeholder="Policy number"
                value={line.policyNumber ?? ""}
                onChange={(e) => {
                  const lines = draft.lines.slice();
                  lines[i] = { ...line, policyNumber: e.target.value };
                  setDraft({ ...draft, lines });
                }}
              />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Input
                  placeholder="Effective YYYY-MM-DD"
                  value={line.effectiveDate ?? ""}
                  onChange={(e) => {
                    const lines = draft.lines.slice();
                    lines[i] = { ...line, effectiveDate: e.target.value };
                    setDraft({ ...draft, lines });
                  }}
                />
                <Input
                  placeholder="Expiration YYYY-MM-DD"
                  value={line.expirationDate ?? ""}
                  onChange={(e) => {
                    const lines = draft.lines.slice();
                    lines[i] = { ...line, expirationDate: e.target.value };
                    setDraft({ ...draft, lines });
                  }}
                />
              </div>
            </div>
          ))}
          <Button
            type="button"
            tone="ghost"
            onClick={() => setDraft({ ...draft, lines: [...draft.lines, { ...EMPTY_LINE, coverageType: "other" }] })}
          >
            Add coverage line
          </Button>
          {save.error ? <p className="text-sm text-bad">{save.error.message}</p> : null}
          <Button type="submit" disabled={save.isPending} className="min-h-12 w-full sm:w-auto">
            Confirm — compute status
          </Button>
        </form>
      </div>
    </div>
  );
}
