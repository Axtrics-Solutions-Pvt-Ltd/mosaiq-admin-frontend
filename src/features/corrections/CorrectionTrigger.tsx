"use client";

import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui/Tooltip";

import {
  type CalculatedMetricCode,
  calculatedMetricHint,
  calculatedMetrics,
} from "./contracts";

function isCalculatedMetric(code: string): code is CalculatedMetricCode {
  return Object.hasOwn(calculatedMetrics, code);
}

// The pencil beside a report value. A calculated metric never opens the
// correction dialog; its pencil explains which inputs to edit instead.
export function CorrectionTrigger({
  metricCode,
  metricLabel,
  onCorrect,
}: {
  metricCode: string;
  metricLabel: string;
  onCorrect: () => void;
}) {
  if (isCalculatedMetric(metricCode))
    return (
      <Tooltip content={calculatedMetricHint(metricCode)}>
        {/* aria-disabled keeps the button focusable so the tooltip is reachable. */}
        <Button
          aria-disabled
          aria-label={`${metricLabel}: ${calculatedMetricHint(metricCode)}`}
          className="cursor-not-allowed opacity-60"
          size="icon"
          type="button"
          variant="ghost"
        >
          <Pencil aria-hidden className="size-4" />
        </Button>
      </Tooltip>
    );
  return (
    <Button
      aria-label={`Correct ${metricLabel}`}
      onClick={onCorrect}
      size="icon"
      type="button"
      variant="ghost"
    >
      <Pencil aria-hidden className="size-4" />
    </Button>
  );
}
