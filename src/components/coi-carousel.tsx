import { useEffect, useState } from "react";

const SLIDES = [
  {
    insured: "Iron Ridge Electric LLC",
    holder: "Northfork GC",
    line: "Hartford · GL-4419",
    expiration: "2026-01-01",
    extra: "Workers' comp · not on file",
    stamp: "EXPIRED",
    stampClass: "border-bad text-bad",
    status: "Expired · recompute live",
    statusClass: "text-bad",
  },
  {
    insured: "Harbor HVAC",
    holder: "Northfork GC",
    line: "Travelers · GL-8801",
    expiration: "2026-10-02",
    extra: "Additional insured · yes",
    stamp: "EXPIRING",
    stampClass: "border-warn text-warn",
    status: "Expiring · 29 days",
    statusClass: "text-warn",
  },
  {
    insured: "Westbrook Concrete",
    holder: "Northfork GC",
    line: "Zurich · GL-2204",
    expiration: "2027-03-15",
    extra: "Workers' comp · missing",
    stamp: "MISSING",
    stampClass: "border-bad text-bad",
    status: "Missing · WC required",
    statusClass: "text-bad",
  },
];

export function CoiCarousel() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = window.setInterval(() => setI((n) => (n + 1) % SLIDES.length), 5200);
    return () => window.clearInterval(t);
  }, [paused]);

  const slide = SLIDES[i];
  const prev = () => setI((n) => (n - 1 + SLIDES.length) % SLIDES.length);
  const next = () => setI((n) => (n + 1) % SLIDES.length);

  return (
    <div
      className="relative mx-auto w-full max-w-md md:max-w-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="pointer-events-none absolute inset-x-6 top-4 h-[calc(100%-3rem)] rotate-[4deg] bg-raised" />
      <div className="pointer-events-none absolute inset-x-3 top-2 h-[calc(100%-3rem)] rotate-[2deg] border border-border bg-surface" />

      <div className="paper-float relative overflow-hidden rotate-[-1.5deg] bg-paper p-5 text-ink shadow-[0_24px_50px_-28px_rgba(0,0,0,0.8)] sm:p-6">
        <div className="scan-line pointer-events-none absolute inset-x-0 top-0 h-10" />
        <div className="flex items-start justify-between gap-3 border-b border-ink/15 pb-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-ink/60">ACORD 25</div>
            <div className="font-display text-2xl">Certificate of Insurance</div>
          </div>
          <div className={`rounded-sm border-2 px-2 py-1 font-display text-lg tracking-wide ${slide.stampClass}`}>
            {slide.stamp}
          </div>
        </div>
        <dl className="mt-4 space-y-2 text-sm">
          <Row k="Named insured" v={slide.insured} />
          <Row k="Holder" v={slide.holder} />
          <Row k="General liability" v={slide.line} />
          <Row k="Expiration" v={slide.expiration} warn={slide.stamp !== "MISSING"} />
          <Row k="Note" v={slide.extra} warn />
        </dl>
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-ink/15 pt-3 text-[11px] uppercase tracking-wider">
          <span className="text-ink/50">Derived status</span>
          <span className={`font-semibold ${slide.statusClass}`}>{slide.status}</span>
        </div>
      </div>

      <div className="relative z-10 mt-4 flex items-center justify-center gap-4">
        <button type="button" className="carousel-arrow" aria-label="Previous certificate" onClick={prev}>
          <Chevron dir="left" />
        </button>
        <div className="flex items-center gap-2" role="tablist" aria-label="Certificate samples">
          {SLIDES.map((s, n) => (
            <button
              key={s.insured}
              type="button"
              role="tab"
              aria-selected={n === i}
              aria-label={s.insured}
              className={`photo-dot ${n === i ? "on" : ""}`}
              onClick={() => setI(n)}
            />
          ))}
        </div>
        <button type="button" className="carousel-arrow" aria-label="Next certificate" onClick={next}>
          <Chevron dir="right" />
        </button>
      </div>
    </div>
  );
}

function Row({ k, v, warn }: { k: string; v: string; warn?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-ink/10 pb-2">
      <dt className="text-[11px] uppercase tracking-wider text-ink/50">{k}</dt>
      <dd className={`text-right font-medium ${warn ? "text-bad" : ""}`}>{v}</dd>
    </div>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      {dir === "left" ? (
        <path d="M10 3 L5 8 L10 13" stroke="currentColor" strokeWidth="1.5" />
      ) : (
        <path d="M6 3 L11 8 L6 13" stroke="currentColor" strokeWidth="1.5" />
      )}
    </svg>
  );
}
