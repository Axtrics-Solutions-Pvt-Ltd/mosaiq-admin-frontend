const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const numberFormatter = new Intl.NumberFormat("en-US");

export function formatDate(value: string | Date) {
  return dateFormatter.format(
    typeof value === "string" ? new Date(`${value}T00:00:00Z`) : value,
  );
}

export function formatNumber(value: number) {
  return numberFormatter.format(value);
}
