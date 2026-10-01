// Chart colours come from the design tokens so charts follow the theme.
export const chartColors = [
  "var(--chart-blue)",
  "var(--chart-amber)",
  "var(--chart-teal)",
  "var(--chart-indigo)",
  "var(--chart-cyan)",
  "var(--chart-purple)",
] as const;

export function chartColor(index: number): string {
  return chartColors[index % chartColors.length] ?? chartColors[0];
}

// Ring charts shrink with narrow cards (two columns beside the builder
// inspector leave about 8rem), so the centre is sized against the ring itself
// through container units rather than fixed text sizes. The hole spans about
// 57% of the ring, so the centre box stays inside it.
export const ringFrameClass =
  "@container relative mx-auto aspect-square w-full max-w-48";
export const ringCenterClass =
  "pointer-events-none absolute inset-x-[23%] inset-y-[24%] flex flex-col items-center justify-center text-center";
export const ringLabelClass =
  "text-muted-foreground max-w-full truncate text-[length:clamp(0.625rem,6.25cqw,0.75rem)] leading-tight";
// Holds the value and its builder correction control, which wraps beneath
// the value when both do not fit across the hole.
export const ringValueRowClass =
  "pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-x-1";

// Longer centre values step down a size instead of spilling over the ring.
export function ringValueSize(text: string) {
  if (text.length <= 6)
    return "text-[length:min(12.5cqw,1.5rem)] leading-tight";
  if (text.length <= 8)
    return "text-[length:min(10.5cqw,1.25rem)] leading-tight";
  return "text-[length:min(8.5cqw,1rem)] leading-tight";
}

const dayLabel = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
});
const monthLabel = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  year: "numeric",
});

function calendarDay(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : undefined;
}

// `x` is a bucket start date. Weeks are numbered Wk1…, as the portal does.
export function bucketLabel(
  x: string,
  index: number,
  granularity: "day" | "week" | "month",
) {
  if (granularity === "week") return `Wk${index + 1}`;
  const date = calendarDay(x);
  if (!date) return x;
  return granularity === "month"
    ? monthLabel.format(date)
    : dayLabel.format(date);
}
