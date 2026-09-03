import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listRequirements, saveRequirement } from "@/lib/holdfast/actions";
import { COVERAGE_LABELS } from "@/lib/holdfast/types";
import { Button, Input } from "@/components/ui-kit";

export const Route = createFileRoute("/app/requirements")({ component: Requirements });

function Requirements() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["reqs"], queryFn: () => listRequirements() });
  const save = useMutation({
    mutationFn: saveRequirement,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["dashboard"] }),
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl">Standards</h1>
        <p className="text-sm text-muted">Org-wide. Per-project overrides ship after design partners use this weekly.</p>
      </header>
      <ul className="space-y-3">
        {q.data?.map((r) => (
          <li key={r.id} className="grid gap-2 border border-border bg-surface p-4 md:grid-cols-5">
            <div className="font-medium md:col-span-5">{COVERAGE_LABELS[r.coverageType]}</div>
            <label className="text-xs text-muted">
              Occurrence $
              <Input
                defaultValue={r.perOccurrenceCents != null ? String(r.perOccurrenceCents / 100) : ""}
                onBlur={(e) => {
                  const n = e.target.value ? Math.round(Number(e.target.value) * 100) : null;
                  save.mutate({
                    data: {
                      id: r.id,
                      perOccurrenceCents: n,
                      aggregateCents: r.aggregateCents,
                      requiresAi: r.requiresAi,
                      requiresWos: r.requiresWos,
                    },
                  });
                }}
              />
            </label>
            <label className="text-xs text-muted">
              Aggregate $
              <Input
                defaultValue={r.aggregateCents != null ? String(r.aggregateCents / 100) : ""}
                onBlur={(e) => {
                  const n = e.target.value ? Math.round(Number(e.target.value) * 100) : null;
                  save.mutate({
                    data: {
                      id: r.id,
                      perOccurrenceCents: r.perOccurrenceCents,
                      aggregateCents: n,
                      requiresAi: r.requiresAi,
                      requiresWos: r.requiresWos,
                    },
                  });
                }}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                defaultChecked={r.requiresAi}
                onChange={(e) =>
                  save.mutate({
                    data: {
                      id: r.id,
                      perOccurrenceCents: r.perOccurrenceCents,
                      aggregateCents: r.aggregateCents,
                      requiresAi: e.target.checked,
                      requiresWos: r.requiresWos,
                    },
                  })
                }
              />
              Additional insured
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                defaultChecked={r.requiresWos}
                onChange={(e) =>
                  save.mutate({
                    data: {
                      id: r.id,
                      perOccurrenceCents: r.perOccurrenceCents,
                      aggregateCents: r.aggregateCents,
                      requiresAi: r.requiresAi,
                      requiresWos: e.target.checked,
                    },
                  })
                }
              />
              Waiver of subrogation
            </label>
            <div className="text-xs text-muted">{save.isPending ? "Saving…" : "Saved on blur"}</div>
          </li>
        ))}
      </ul>
      <Button type="button" tone="ghost" disabled>
        Save is automatic
      </Button>
    </div>
  );
}
