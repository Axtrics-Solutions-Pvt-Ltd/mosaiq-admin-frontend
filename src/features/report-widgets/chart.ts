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
