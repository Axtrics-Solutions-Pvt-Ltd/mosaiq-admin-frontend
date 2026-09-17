import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";

const noteTones = {
  neutral: "text-muted-foreground",
  success: "text-success",
  warning: "text-warning",
} as const;

export function MetricCard({
  change,
  icon: Icon,
  label,
  tone = "success",
  value,
}: {
  change?: string;
  icon: LucideIcon;
  label: string;
  tone?: keyof typeof noteTones;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 sm:pt-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-muted-foreground text-sm">{label}</p>
            <p className="text-strong mt-2 text-3xl font-semibold tabular-nums">
              {value}
            </p>
            {change && (
              <p className={cn("mt-1 text-xs", noteTones[tone])}>{change}</p>
            )}
          </div>
          <span className="bg-primary-soft text-primary rounded-lg p-2.5">
            <Icon aria-hidden className="size-5" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
