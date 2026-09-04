import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { askClerk } from "@/lib/holdfast/actions";
import type { ClerkTurn } from "@/lib/holdfast/clerk";
import { BoardError, Button, Input } from "@/components/ui-kit";

export const Route = createFileRoute("/app/clerk")({ component: Clerk });

const STARTERS = [
  "Who cannot enter the job today?",
  "Who is on the 30-day clock?",
  "Draft the chase script for anyone on HOLD.",
  "What is still open on the books?",
  "Clear Iron Ridge for me.",
];

function Clerk() {
  const [turns, setTurns] = useState<ClerkTurn[]>([
    {
      role: "clerk",
      text: "Radio's up. I only see this board. I cannot CLEAR anyone. Ask who is HOLD, who is WATCH, or for a chase script.",
    },
  ]);
  const [q, setQ] = useState("");
  const ask = useMutation({
    mutationFn: (question: string) =>
      askClerk({ data: { question, history: turns.filter((t) => t.role === "user" || t.role === "clerk").slice(-6) } }),
    onSuccess: (res, question) => {
      setTurns((prev) => [...prev, { role: "user", text: question }, { role: "clerk", text: res.answer }]);
      setQ("");
    },
  });

  function send(text: string) {
    const question = text.trim();
    if (!question || ask.isPending) return;
    ask.mutate(question);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    send(q);
  }

  return (
    <div className="flex min-h-[70vh] flex-col">
      <header className="mb-4">
        <p className="text-[11px] uppercase tracking-[0.24em] text-primary">Grounded copilot</p>
        <h1 className="font-display text-4xl">The clerk</h1>
        <p className="mt-1 max-w-xl text-sm text-muted">
          Looks like a radio, not ChatGPT. Reads the derived board. Will not invent a limit. Will not collect money.
          Last prompt in the list is a trap — it should refuse.
        </p>
      </header>

      <div className="mb-4 flex flex-wrap gap-2">
        {STARTERS.map((s) => (
          <button
            key={s}
            type="button"
            className="rounded-sm border border-border px-3 py-1.5 text-left text-xs text-muted hover:border-primary hover:text-fg"
            onClick={() => send(s)}
          >
            {s}
          </button>
        ))}
      </div>

      <ol className="flex-1 space-y-3">
        {turns.map((t, i) => (
          <li
            key={i}
            className={
              t.role === "clerk"
                ? "border border-border bg-paper p-4 text-ink"
                : "ml-8 border border-border bg-raised p-3 text-sm text-fg"
            }
          >
            <div className="text-[10px] uppercase tracking-[0.18em] text-primary">
              {t.role === "clerk" ? "Clerk" : "Trailer"}
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{t.text}</p>
          </li>
        ))}
        {ask.isPending ? (
          <li className="border border-dashed border-border p-4 text-sm text-muted">Checking the board…</li>
        ) : null}
        {ask.error ? <BoardError error={ask.error} /> : null}
      </ol>

      <form onSubmit={onSubmit} className="mt-4 flex gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Who is HOLD?"
          className="flex-1"
        />
        <Button type="submit" disabled={ask.isPending || !q.trim()}>
          Ask
        </Button>
      </form>
    </div>
  );
}
