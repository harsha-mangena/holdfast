import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ingestCertificate, listCertificates, listVendors } from "@/lib/holdfast/actions";
import { Button, StatusChip } from "@/components/ui-kit";

export const Route = createFileRoute("/app/certificates")({ component: Certificates });

function Certificates() {
  const qc = useQueryClient();
  const vendors = useQuery({ queryKey: ["vendors"], queryFn: () => listVendors() });
  const certs = useQuery({ queryKey: ["certs"], queryFn: () => listCertificates() });
  const [vendorId, setVendorId] = useState("");
  const [msg, setMsg] = useState("");
  const ingest = useMutation({
    mutationFn: async (file: File) => {
      const { fileToBase64, pdfToEvidence } = await import("@/lib/holdfast/pdf-text");
      const evidence = await pdfToEvidence(await file.arrayBuffer());
      const pdfBase64 = await fileToBase64(file);
      return ingestCertificate({
        data: { vendorId, filename: file.name, pdfBase64, text: evidence.text, images: evidence.images },
      });
    },
    onSuccess: (res) => {
      setMsg("Extracted with " + res.extractor + ". Open the row to confirm fields.");
      void qc.invalidateQueries({ queryKey: ["certs"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-4xl">Certificates</h1>
        <p className="text-sm text-muted">Original PDFs stay untouched. We read the text layer and the page image.</p>
      </header>
      <div className="space-y-3 border border-border bg-surface p-4">
        <label className="block text-xs uppercase tracking-wider text-muted">Subcontractor</label>
        <select
          className="min-h-11 w-full rounded-md border border-border bg-raised px-3 text-sm"
          value={vendorId}
          onChange={(e) => setVendorId(e.target.value)}
        >
          <option value="">Select…</option>
          {vendors.data?.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
        <label className="flex min-h-24 cursor-pointer items-center justify-center border border-dashed border-border px-3 text-center text-sm text-muted">
          {ingest.isPending ? "Reading ACORD (vision + text)…" : "Drop or choose a PDF (fake docs only)"}
          <input
            type="file"
            accept="application/pdf"
            className="sr-only"
            disabled={!vendorId || ingest.isPending}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) ingest.mutate(file);
            }}
          />
        </label>
        {ingest.error ? <p className="text-sm text-bad">{ingest.error.message}</p> : null}
        {msg ? <p className="text-sm text-ok">{msg}</p> : null}
      </div>
      <ul className="space-y-2">
        {certs.data?.map((c) => (
          <li key={c.id}>
            <Link
              to="/app/certificates/$id"
              params={{ id: c.id }}
              className="flex min-h-14 flex-wrap items-center justify-between gap-2 border border-border bg-surface px-4 py-3 hover:bg-raised"
            >
              <div>
                <div className="font-medium">{c.original_filename}</div>
                <div className="text-xs text-muted">{c.vendor_name ?? "Unmatched"}</div>
              </div>
              <div className="flex items-center gap-3">
                <StatusChip status={c.status} />
                <span className="text-sm text-primary">{c.status === "needs_review" ? "Review" : "Open"}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
