import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({ component: Terms });

function Terms() {
  return (
    <article className="mx-auto min-h-screen max-w-2xl bg-bg px-4 py-12 text-fg">
      <Link to="/" className="text-sm text-primary">
        ← Holdfast
      </Link>
      <h1 className="mt-6 font-display text-4xl">Terms of service</h1>
      <p className="mt-2 text-sm text-muted">Effective 3 September 2026</p>
      <div className="mt-8 space-y-4 text-sm leading-relaxed text-muted">
        <p>Holdfast provides software that extracts, stores, and derives compliance status from Certificates of Insurance. It is not an insurance product, agency, or legal opinion.</p>
        <p>You must confirm extracted fields before relying on status. Derived status can be wrong if the source PDF is wrong, incomplete, or mis-read. You remain responsible for verifying coverage before work starts.</p>
        <p>Do not upload documents you do not have the right to process. Staging environments are for fake documents only.</p>
        <p>Subscriptions (when live Stripe is connected) are billed monthly on vendor-count plans. This preview uses a trial simulator, not live charges.</p>
        <p>We may suspend accounts that upload malware, scrape other tenants, or attempt to reverse-engineer extraction prompts at abusive volume.</p>
        <p>Governing law: State of Delaware, United States.</p>
      </div>
    </article>
  );
}
