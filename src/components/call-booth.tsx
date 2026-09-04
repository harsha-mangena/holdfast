import { useEffect, useState } from "react";
import { Button } from "@/components/ui-kit";
import { userFacing } from "@/lib/holdfast/errors";

export function CallBooth({
  name,
  phone,
  script,
  status,
  error,
  onHang,
}: {
  name: string;
  phone: string;
  script: string;
  status: string;
  error: unknown;
  onHang: () => void;
}) {
  const [spoken, setSpoken] = useState("");
  useEffect(() => {
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(script);
    u.rate = 0.95;
    u.pitch = 0.95;
    const voices = synth.getVoices();
    const en = voices.find((v) => /en[-_]?US/i.test(v.lang) && /male|daniel|david|fred/i.test(v.name)) ?? voices.find((v) => /en/i.test(v.lang));
    if (en) u.voice = en;
    u.onboundary = (ev) => {
      if (typeof ev.charIndex === "number") setSpoken(script.slice(0, ev.charIndex + (ev.charLength ?? 1)));
    };
    u.onend = () => setSpoken(script);
    synth.speak(u);
    return () => synth.cancel();
  }, [script]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-bg/80 p-4">
      <div className="w-full max-w-md border border-border bg-surface p-5">
        <p className="text-[11px] uppercase tracking-[0.22em] text-primary">Voice agent</p>
        <h2 className="font-display text-3xl">{name}</h2>
        <p className="text-sm text-muted">{phone}</p>
        <div className="mt-4 flex items-center gap-3">
          <span className="h-3 w-3 animate-pulse rounded-full bg-ok" />
          <span className="text-sm">{status}</span>
        </div>
        <p className="mt-4 max-h-48 overflow-auto text-sm leading-relaxed text-fg">{spoken || "Connecting…"}</p>
        {error ? <p className="mt-3 text-sm text-bad">{userFacing(error)}</p> : null}
        <Button tone="danger" className="mt-5 w-full" onClick={onHang}>
          Hang up
        </Button>
      </div>
    </div>
  );
}
