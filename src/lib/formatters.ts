const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const numberFormatter = new Intl.NumberFormat("en-US");

export function formatDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? "--" : dateFormatter.format(date);
}

export function formatNumber(value: number) {
  return numberFormatter.format(value);
}
