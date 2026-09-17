import type { AgencySummary } from "@/features/agencies/view-model";
import { cn } from "@/lib/utils/cn";

const tones: Record<AgencySummary["logoTone"], string> = {
  blue: "bg-primary-soft text-primary",
  cyan: "bg-info-soft text-info",
  indigo: "bg-indigo-50 text-indigo-700",
  teal: "bg-teal-50 text-teal-700",
  violet: "bg-violet-50 text-violet-700",
};

export function AgencyLogo({
  className,
  name,
  tone,
}: {
  className?: string;
  name: string;
  tone: AgencySummary["logoTone"];
}) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-lg text-sm font-semibold",
        tones[tone],
        className,
      )}
    >
      {initials}
    </span>
  );
}
