"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

import { StatePanel } from "@/components/shared/StatePanel";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/Toast";
import { useUnsavedChangesWarning } from "@/features/reports/useUnsavedChangesWarning";
import type { WorkspaceRecord } from "@/features/workspaces/contracts";
import { ApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils/cn";

import {
  type BudgetCells,
  budgetCells,
  cellKey,
  changedCells,
  invalidCells,
  monthsOfYear,
} from "./budget-grid";
import { useBudgets, useUpdateBudgets } from "./queries";

// The anchor the report builder's "Add budgets" link opens.
export const budgetsCardId = "budgets";

const monthLabel = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
});
function formatMonth(month: string) {
  const [year, index] = month.split("-").map(Number);
  return monthLabel.format(new Date(year ?? 0, (index ?? 1) - 1, 1));
}

export function BudgetsCard({
  agencyId,
  clientId,
  workspaces,
}: {
  agencyId: number;
  clientId: number;
  workspaces: readonly WorkspaceRecord[];
}) {
  const query = useBudgets(agencyId, clientId);
  const mutation = useUpdateBudgets(agencyId, clientId);
  const [year, setYear] = useState(() => new Date().getFullYear());
  // Only edited cells are held here; the rest show the saved amounts.
  const [edits, setEdits] = useState<BudgetCells>({});
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");

  const saved = budgetCells(query.data ?? []);
  const draft = { ...saved, ...edits };
  const changes = changedCells(saved, draft);
  const invalid = new Set(invalidCells(edits));
  const isDirty = changes.length > 0 || invalid.size > 0;
  useUnsavedChangesWarning(isDirty);
  const months = monthsOfYear(year);

  // The card mounts after the client loads, too late for the browser's own
  // jump to `#budgets`, so the link from the report builder lands here.
  useEffect(() => {
    if (window.location.hash !== `#${budgetsCardId}`) return;
    const card = document.getElementById(budgetsCardId);
    card?.scrollIntoView({ block: "start" });
    card?.focus({ preventScroll: true });
  }, []);

  function edit(key: string, value: string) {
    setEdits((current) => ({ ...current, [key]: value }));
    setServerErrors(({ [key]: _, ...rest }) => rest);
  }

  async function save() {
    setFormError("");
    if (invalid.size > 0) {
      setFormError(
        "Enter each budget as an amount such as 12500 or 12,500.50.",
      );
      return;
    }
    try {
      await mutation.mutateAsync({ items: changes });
      setEdits({});
      setServerErrors({});
      toast({ title: "Budgets saved", tone: "success" });
    } catch (error) {
      if (!(error instanceof ApiError)) {
        setFormError("The budgets could not be saved. Please try again.");
        return;
      }
      // `items.3.amount` names the fourth change sent.
      const mapped: Record<string, string> = {};
      for (const [field, message] of Object.entries(error.fieldErrors)) {
        const index = /^items\.(\d+)\./.exec(field)?.[1];
        const change = index === undefined ? undefined : changes[Number(index)];
        if (change)
          mapped[cellKey(change.workspace_id, change.month)] = message;
      }
      setServerErrors(mapped);
      setFormError(
        Object.keys(mapped).length
          ? "Review the highlighted budgets."
          : error.message,
      );
    }
  }

  const body = () => {
    if (workspaces.length === 0)
      return (
        <StatePanel
          description="Add a channel workspace to enter its budgets."
          kind="empty"
          title="No channel workspaces"
        />
      );
    if (query.isPending) return <Skeleton className="h-64 w-full" />;
    if (query.isError)
      return (
        <StatePanel
          action={<Button onClick={() => query.refetch()}>Try again</Button>}
          description={
            query.error instanceof ApiError && query.error.status === 403
              ? "You don't have access to these budgets."
              : "The budgets could not be loaded."
          }
          kind="error"
          title="Budgets unavailable"
        />
      );
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Button
              aria-label="Previous year"
              className="size-9"
              onClick={() => setYear(year - 1)}
              size="icon"
              type="button"
              variant="outline"
            >
              <ChevronLeft aria-hidden className="size-4" />
            </Button>
            <p
              aria-live="polite"
              className="text-strong min-w-16 text-center font-semibold tabular-nums"
            >
              {year}
            </p>
            <Button
              aria-label="Next year"
              className="size-9"
              onClick={() => setYear(year + 1)}
              size="icon"
              type="button"
              variant="outline"
            >
              <ChevronRight aria-hidden className="size-4" />
            </Button>
          </div>
          <p className="text-muted-foreground text-xs">
            Leave a month empty for no budget. Clearing an amount removes it.
          </p>
        </div>
        {formError && (
          <p
            className="text-destructive rounded-md border p-2 text-sm"
            role="alert"
          >
            {formError}
          </p>
        )}
        <div
          aria-label={`Budgets for ${year}`}
          className="focus-visible:ring-ring overflow-x-auto rounded-md border focus-visible:ring-2 focus-visible:outline-none"
          role="region"
          tabIndex={0}
        >
          <table className="w-full text-left text-sm">
            <caption className="sr-only">
              Monthly budget per channel workspace for {year}
            </caption>
            <thead className="bg-muted">
              <tr>
                <th
                  className="bg-muted text-muted-foreground sticky left-0 px-3 py-2 text-xs font-medium"
                  scope="col"
                >
                  Month
                </th>
                {workspaces.map((workspace) => (
                  <th
                    className="text-muted-foreground min-w-36 px-3 py-2 text-xs font-medium"
                    key={workspace.id}
                    scope="col"
                  >
                    <span className="text-strong block">{workspace.name}</span>
                    {workspace.connector?.name ?? "No channel"} ·{" "}
                    {workspace.currency}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {months.map((month) => (
                <tr className="border-t" key={month}>
                  <th
                    className="bg-card text-strong sticky left-0 px-3 py-1.5 font-medium whitespace-nowrap"
                    scope="row"
                  >
                    {formatMonth(month)}
                  </th>
                  {workspaces.map((workspace) => {
                    const key = cellKey(workspace.id, month);
                    const error =
                      serverErrors[key] ??
                      (invalid.has(key) ? "Enter an amount." : undefined);
                    const isChanged = changes.some(
                      (change) =>
                        cellKey(change.workspace_id, change.month) === key,
                    );
                    return (
                      <td className="px-2 py-1.5 align-top" key={key}>
                        <Input
                          aria-describedby={error ? `${key}-error` : undefined}
                          aria-invalid={Boolean(error)}
                          aria-label={`${workspace.name} budget for ${formatMonth(month)}`}
                          autoComplete="off"
                          className={cn(
                            "h-9 text-right tabular-nums",
                            isChanged && !error && "border-primary",
                          )}
                          inputMode="decimal"
                          onChange={(event) => edit(key, event.target.value)}
                          value={draft[key] ?? ""}
                        />
                        {error && (
                          <p
                            className="text-destructive mt-1 text-xs"
                            id={`${key}-error`}
                          >
                            {error}
                          </p>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
          <span className="text-muted-foreground text-xs" role="status">
            {changes.length === 0
              ? "No unsaved changes"
              : `${changes.length} unsaved ${changes.length === 1 ? "change" : "changes"}`}
          </span>
          <div className="flex gap-2">
            <Button
              disabled={!isDirty || mutation.isPending}
              onClick={() => {
                setEdits({});
                setServerErrors({});
                setFormError("");
              }}
              type="button"
              variant="outline"
            >
              Discard
            </Button>
            <Button
              disabled={!isDirty || mutation.isPending}
              onClick={save}
              type="button"
            >
              {mutation.isPending ? "Saving..." : "Save budgets"}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card
      className="scroll-mt-4 focus:outline-none"
      id={budgetsCardId}
      tabIndex={-1}
    >
      <CardHeader>
        <CardTitle>Budgets</CardTitle>
        <p className="text-muted-foreground text-sm">
          Monthly budget per channel workspace. Reports use it for budget
          pacing.
        </p>
      </CardHeader>
      <CardContent>{body()}</CardContent>
    </Card>
  );
}
