const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const numberFormatter = new Intl.NumberFormat("en-US");

// A date without a time is a calendar day. `new Date("2026-09-24")` reads it as
// UTC midnight, which shows the previous day west of Greenwich.
function parseDate(value: string) {
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return day
    ? new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3]))
    : new Date(value);
}

export function formatDate(value: string | Date) {
  const date = typeof value === "string" ? parseDate(value) : value;
  return Number.isNaN(date.getTime()) ? "--" : dateFormatter.format(date);
}

export function formatDateRange(from: string, to: string) {
  return `${formatDate(from)}–${formatDate(to)}`;
}

export function formatDateTime(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? "--" : dateTimeFormatter.format(date);
}

export function formatNumber(value: number) {
  return numberFormatter.format(value);
}

export const valueFormats = [
  "currency",
  "number",
  "percent",
  "multiplier",
  "text",
] as const;
export type ValueFormat = (typeof valueFormats)[number];

const compactThreshold = 1000;
const compactNumber = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const plainNumber = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

function scaledNumber(value: number) {
  return Math.abs(value) >= compactThreshold
    ? compactNumber.format(value)
    : plainNumber.format(value);
}

function scaledCurrency(value: number, currency: string) {
  const isCompact = Math.abs(value) >= compactThreshold;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      // Report values show "$127.9K" whatever the dollar, like the portal.
      currencyDisplay: "narrowSymbol",
      notation: isCompact ? "compact" : "standard",
      maximumFractionDigits: isCompact ? 1 : 2,
    }).format(value);
  } catch {
    return `${currency} ${scaledNumber(value)}`;
  }
}

// Report widget values arrive raw with a display format (public report
// contract §3). Large values are compact: $127.9K, 4.8M.
export function formatValue(
  value: number | string | null | undefined,
  format: string,
  currency: string,
) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string" || format === "text") return String(value);
  if (!Number.isFinite(value)) return "—";
  switch (format) {
    case "currency":
      return scaledCurrency(value, currency);
    case "percent":
      return `${plainNumber.format(value)}%`;
    case "multiplier":
      return `${plainNumber.format(value)}x`;
    default:
      return scaledNumber(value);
  }
}

export function formatCurrency(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(value);
  } catch {
    // An unknown currency code still shows the amount.
    return `${currency} ${formatNumber(value)}`;
  }
}
