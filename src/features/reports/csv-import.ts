import type { CsvImportFile, LayoutItem } from "./contracts";

// Pure helpers for the CSV import dialog.

export type CsvTemplateFormat = "csv" | "zip";

// The template downloads offered for a section or tab: one combined CSV and a
// zip of one CSV per card. Removing a value hides its button.
export const csvTemplateFormats: readonly CsvTemplateFormat[] = ["csv", "zip"];

// A stable key for a chosen file; the same file chosen twice is kept once.
export function chosenFileKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

// A stable key for a result. A combined file gives a result per `#card`
// block, and the same card twice gives two blocks of one name.
export function csvResultKey(result: CsvImportFile) {
  return `${result.source ?? ""}|${result.file}|${result.line ?? ""}`;
}

// A problem with a file as a whole (a row before the first `#card`, a zip
// that can't be opened), not with one card.
export const isFileLevelError = (result: CsvImportFile) =>
  result.status === "invalid" && !result.widget;

// The widget codes Apply posts as `cards[]`: every ready card, whichever
// file it came from. The API leaves the other cards alone.
export function readyCardCodes(results: readonly CsvImportFile[]) {
  return [
    ...new Set(
      results.flatMap((result) =>
        result.status === "ready" && result.widget ? [result.widget.code] : [],
      ),
    ),
  ];
}

// Each widget's place under the scope, in canvas order: tab by tab, then
// card by card.
function widgetOrder(scope: LayoutItem) {
  const order = new Map<number, number>();
  const visit = (item: LayoutItem) => {
    if (item.level === "widget") order.set(item.id, order.size);
    [...item.children].sort((a, b) => a.position - b.position).forEach(visit);
  };
  visit(scope);
  return order;
}

// The rows the review lists: ignored files (a README, folders) are left out,
// file-level errors come first, then the cards by tab then card, with
// unmatched files last by name.
export function csvReviewRows(
  scope: LayoutItem,
  results: readonly CsvImportFile[],
) {
  const order = widgetOrder(scope);
  const place = (result: CsvImportFile) =>
    isFileLevelError(result)
      ? -1
      : result.widget
        ? (order.get(result.widget.id) ?? order.size)
        : Infinity;
  return results
    .filter((result) => result.status !== "ignored")
    .sort(
      (a, b) =>
        place(a) - place(b) ||
        (a.tab?.title ?? "").localeCompare(b.tab?.title ?? "") ||
        a.file.localeCompare(b.file) ||
        (a.line ?? 0) - (b.line ?? 0),
    );
}

// Where an imported card would still not show in the portal.
export function hiddenScopeNote(result: CsvImportFile) {
  if (result.status !== "ready") return undefined;
  if (result.section_enabled === false)
    return "The section is hidden. Show it in the structure to publish this card.";
  if (result.tab?.is_enabled === false)
    return "The tab is hidden. Show it in the structure to publish this card.";
  return undefined;
}

// The API's message for an audience code the report doesn't have, which the
// admin fixes in report settings.
export function isUnknownAudienceError(message: string) {
  return /audience codes?:/i.test(message);
}

// Today in the admin's time zone, for the "As of" default.
export function todayIsoDate(now = new Date()) {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}
