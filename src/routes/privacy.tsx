import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({ component: Privacy });

function Privacy() {
  return (
    <article className="mx-auto min-h-screen max-w-2xl bg-bg px-4 py-12 text-fg">
      <Link to="/" className="text-sm text-primary">
        ← Holdfast
      </Link>
      <h1 className="mt-6 font-display text-4xl">Privacy policy</h1>
      <p className="mt-2 text-sm text-muted">Effective 3 September 2026 · United States</p>
      <div className="mt-8 space-y-4 text-sm leading-relaxed text-muted">
        <p>Holdfast is the processor. Your company is the controller of Certificate of Insurance documents you upload.</p>
        <p>We collect account identifiers (email, name from sign-in) and the commercial insurance documents you choose to store. COIs are business records. We minimize incidental personal identifiers (agent names) and do not sell data.</p>
        <p>State comprehensive privacy laws (including CCPA/CPRA) generally treat B2B commercial data differently from consumer data. Where personal information appears on a certificate, you may request access or deletion from Settings → Office.</p>
        <p>We use subprocessors for hosting, authentication, and (when configured) document extraction via xAI. Original PDFs are stored privately and are not used to train models by Holdfast.</p>
        <p>We are not a financial institution under GLBA. We do not sell insurance.</p>
        <p>Contact: privacy@holdfast.example (replace with your domain before launch).</p>
      </div>
    </article>
  );
}
