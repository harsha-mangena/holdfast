import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { userFacing } from "@/lib/holdfast/errors";

export function Button({
  tone = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "primary" | "ghost" | "danger" | "paper" }) {
  const tones: Record<string, string> = {
    primary: "bg-primary text-primary-fg hover:opacity-90",
    ghost: "border border-border bg-transparent text-fg hover:bg-raised",
    danger: "bg-bad text-fg hover:opacity-90",
    paper: "bg-paper text-ink hover:opacity-90",
  };
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-semibold tracking-wide transition-[transform,opacity] duration-150 ease-out active:not-disabled:scale-[0.96] ${tones[tone]} disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`min-h-11 w-full rounded-md border border-border bg-raised px-3 text-sm text-fg placeholder:text-muted outline-none focus:border-primary ${props.className ?? ""}`}
    />
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wider text-muted">{label}</span>
      {children}
    </label>
  );
}

export function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    compliant: "text-ok border-ok/40",
    expiring: "text-warn border-warn/40",
    expired: "text-bad border-bad/40",
    missing: "text-bad border-bad/40",
    insufficient: "text-warn border-warn/40",
    needs_review: "text-warn border-warn/40",
    confirmed: "text-ok border-ok/40",
    failed: "text-bad border-bad/40",
    rejected: "text-muted border-border",
  };
  return (
    <span className={`inline-flex rounded-sm border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${map[status] ?? "text-muted border-border"}`}>
      {status.replace("_", " ")}
    </span>
  );
}

export function BoardError({ error }: { error: unknown }) {
  if (!error) return null;
  return <p className="text-sm text-bad">{userFacing(error)}</p>;
}
