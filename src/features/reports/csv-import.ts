import type { CsvImportFile, LayoutItem } from "./contracts";

// Pure helpers for the CSV import dialog.

const isZip = (file: File) => file.name.toLowerCase().endsWith(".zip");

// A stable key for a chosen file; the same file chosen twice is kept once.
export function chosenFileKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

export type CsvApplyPlan = {
  // The chosen files to post again on Apply.
  uploads: File[];
  // The ready cards those files fill.
  readyCount: number;
  // Zips left out because a file inside has errors.
  blockedZips: string[];
};

// Apply is refused if any posted file has errors, so only the uploads whose
// cards are all ready (or harmlessly unused) are posted. A `.csv` matches its
// result by name. The API names a zip's files by their path inside it, so a
// result no chosen `.csv` matches came from a zip; with several zips, one
// file with errors holds them all back.
export function csvApplyPlan(
  chosen: readonly File[],
  results: readonly CsvImportFile[],
): CsvApplyPlan {
  const csvNames = new Set(
    chosen.filter((file) => !isZip(file)).map((file) => file.name),
  );
  const fromCsv = results.filter((result) => csvNames.has(result.file));
  const fromZips = results.filter((result) => !csvNames.has(result.file));
  const isZipBlocked = fromZips.some((result) => result.status === "invalid");
  const zipReady = fromZips.filter((result) => result.status === "ready");
  const zips = chosen.filter(isZip);
  const readyCsvNames = new Set(
    fromCsv
      .filter((result) => result.status === "ready")
      .map((result) => result.file),
  );
  const uploads = [
    ...chosen.filter((file) => !isZip(file) && readyCsvNames.has(file.name)),
    ...(isZipBlocked || zipReady.length === 0 ? [] : zips),
  ];
  return {
    uploads,
    readyCount: readyCsvNames.size + (isZipBlocked ? 0 : zipReady.length),
    blockedZips: isZipBlocked ? zips.map((file) => file.name) : [],
  };
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
// the others sorted by tab then card, with unmatched files last by name.
export function csvReviewRows(
  scope: LayoutItem,
  results: readonly CsvImportFile[],
) {
  const order = widgetOrder(scope);
  const place = (result: CsvImportFile) =>
    result.widget ? (order.get(result.widget.id) ?? order.size) : Infinity;
  return results
    .filter((result) => result.status !== "ignored")
    .sort(
      (a, b) =>
        place(a) - place(b) ||
        (a.tab?.title ?? "").localeCompare(b.tab?.title ?? "") ||
        a.file.localeCompare(b.file),
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
