import type { ErrorComponentProps } from "@tanstack/react-router";
import { userFacing } from "@/lib/holdfast/errors";

export function AppErrorComponent({ error }: ErrorComponentProps) {
  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-6 text-center text-fg">
      <div className="max-w-md space-y-3">
        <p className="text-[11px] uppercase tracking-[0.22em] text-primary">Holdfast</p>
        <h1 className="font-display text-4xl">The board hiccuped</h1>
        <p className="text-sm text-muted">{userFacing(error)}</p>
        <a href="/app" className="inline-block text-sm text-primary underline">
          Back to the board
        </a>
      </div>
    </main>
  );
}
