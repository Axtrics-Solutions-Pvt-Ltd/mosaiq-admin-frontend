"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils/cn";

import {
  type BudgetCells,
  budgetCells,
  cellKey,
  changedCells,
  invalidCells,
} from "./budget-grid";
import { useBudgets, useUpdateBudgets } from "./queries";

export type BudgetWorkspace = {
  id: number;
  name: string;
  currency: string;
  channel: { name: string } | null;
};

const monthLabel = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
});
function formatMonth(month: string) {
  const [year, index] = month.split("-").map(Number);
  return monthLabel.format(new Date(year ?? 0, (index ?? 1) - 1, 1));
}

// `YYYY-MM` moved by whole months.
function shiftMonth(month: string, by: number) {
  const [year, index] = month.split("-").map(Number);
  const date = new Date(year ?? 0, (index ?? 1) - 1 + by, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

// The report builder's budget editor: one month at a time, one amount per
// workspace of the report, so it fits the inspector. The client page's
// Budgets card edits the whole year.
export function BudgetMonthEditor({
  agencyId,
  allBudgetsHref,
  clientId,
  focusRequest,
  initialMonth,
  onDirtyChange,
  workspaces,
}: {
  agencyId: number;
  allBudgetsHref: string;
  clientId: number;
  // Changes each time "Add budgets" is chosen, to bring the editor into view.
  focusRequest: number;
  // `YYYY-MM`, usually the last month of the previewed range.
  initialMonth: string;
  onDirtyChange: (isDirty: boolean) => void;
  workspaces: readonly BudgetWorkspace[];
}) {
  const query = useBudgets(agencyId, clientId);
  const mutation = useUpdateBudgets(agencyId, clientId);
  const [month, setMonth] = useState(initialMonth);
  // Edits are kept per cell, so moving between months keeps them.
  const [edits, setEdits] = useState<BudgetCells>({});
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const sectionRef = useRef<HTMLElement>(null);

  const saved = budgetCells(query.data ?? []);
  const draft = { ...saved, ...edits };
  const changes = changedCells(saved, draft);
  const invalid = new Set(invalidCells(edits));
  const isDirty = changes.length > 0 || invalid.size > 0;

  useEffect(() => onDirtyChange(isDirty), [isDirty, onDirtyChange]);
  // Edits left behind when the widget is closed no longer block anything.
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

  useEffect(() => {
    if (focusRequest === 0) return;
    const section = sectionRef.current;
    section?.scrollIntoView({ block: "start", behavior: "smooth" });
    section?.querySelector("input")?.focus({ preventScroll: true });
  }, [focusRequest, query.isPending]);

  function edit(key: string, value: string) {
    setEdits((current) => ({ ...current, [key]: value }));
    setServerErrors(({ [key]: _, ...rest }) => rest);
  }

  function discard() {
    setEdits({});
    setServerErrors({});
    setFormError("");
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
      discard();
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
        <p className="text-muted-foreground text-sm">
          This report has no channel workspaces to budget.
        </p>
      );
    if (query.isPending) return <Skeleton className="h-32 w-full" />;
    if (query.isError)
      return (
        <div className="space-y-2">
          <p className="text-destructive text-sm" role="alert">
            {query.error instanceof ApiError && query.error.status === 403
              ? "You don't have access to these budgets."
              : "The budgets could not be loaded."}
          </p>
          <Button
            onClick={() => query.refetch()}
            size="sm"
            type="button"
            variant="outline"
          >
            Try again
          </Button>
        </div>
      );
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-1">
          <Button
            aria-label="Previous month"
            className="size-8"
            onClick={() => setMonth(shiftMonth(month, -1))}
            size="icon"
            type="button"
            variant="outline"
          >
            <ChevronLeft aria-hidden className="size-4" />
          </Button>
          <p
            aria-live="polite"
            className="text-strong text-sm font-semibold tabular-nums"
          >
            {formatMonth(month)}
          </p>
          <Button
            aria-label="Next month"
            className="size-8"
            onClick={() => setMonth(shiftMonth(month, 1))}
            size="icon"
            type="button"
            variant="outline"
          >
            <ChevronRight aria-hidden className="size-4" />
          </Button>
        </div>
        {formError && (
          <p
            className="text-destructive rounded-md border p-2 text-xs"
            role="alert"
          >
            {formError}
          </p>
        )}
        <ul className="space-y-3">
          {workspaces.map((workspace) => {
            const key = cellKey(workspace.id, month);
            const id = `budget-${key}`;
            const error =
              serverErrors[key] ??
              (invalid.has(key) ? "Enter an amount." : undefined);
            const isChanged = changes.some(
              (change) => cellKey(change.workspace_id, change.month) === key,
            );
            return (
              <li className="space-y-1" key={workspace.id}>
                <label className="block text-xs" htmlFor={id}>
                  <span className="text-strong block font-medium">
                    {workspace.name}
                  </span>
                  <span className="text-muted-foreground">
                    {workspace.channel?.name ?? "No channel"} ·{" "}
                    {workspace.currency}
                  </span>
                </label>
                <Input
                  aria-describedby={error ? `${id}-error` : undefined}
                  aria-invalid={Boolean(error)}
                  aria-label={`${workspace.name} budget for ${formatMonth(month)}`}
                  autoComplete="off"
                  className={cn(
                    "h-9 text-right tabular-nums",
                    isChanged && !error && "border-primary",
                  )}
                  id={id}
                  inputMode="decimal"
                  onChange={(event) => edit(key, event.target.value)}
                  placeholder="No budget"
                  value={draft[key] ?? ""}
                />
                {error && (
                  <p className="text-destructive text-xs" id={`${id}-error`}>
                    {error}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-muted-foreground text-xs" role="status">
            {changes.length === 0
              ? "No unsaved budgets"
              : `${changes.length} unsaved ${changes.length === 1 ? "budget" : "budgets"}`}
          </span>
          <div className="flex gap-2">
            <Button
              disabled={!isDirty || mutation.isPending}
              onClick={discard}
              size="sm"
              type="button"
              variant="outline"
            >
              Discard
            </Button>
            <Button
              disabled={!isDirty || mutation.isPending}
              onClick={save}
              size="sm"
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
    <section
      aria-labelledby="budget-editor-title"
      className="scroll-mt-4 space-y-3 border-t pt-4"
      ref={sectionRef}
    >
      <div className="space-y-1">
        <h3
          className="text-strong text-sm font-semibold"
          id="budget-editor-title"
        >
          Monthly budgets
        </h3>
        <p className="text-muted-foreground text-xs">
          Pacing compares spend with these budgets, prorated to the report
          range. They are shared by every report of this client. Leave a month
          empty for no budget.
        </p>
      </div>
      {body()}
      <Link
        className="text-primary inline-block text-xs font-medium hover:underline"
        href={allBudgetsHref}
      >
        Edit the whole year on the client page
      </Link>
    </section>
  );
}
