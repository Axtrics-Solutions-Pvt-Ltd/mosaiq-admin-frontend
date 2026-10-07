// Mirrors the API's `AudienceContentFilter`, so a Marketing Intelligence
// widget's unsaved content previews the way the API will serve it for the
// selected audiences. Entries may carry an `audience` code; a list with at
// least one tagged entry is "tagged", and only tagged lists change:
// - summary lists show the untagged entries (the totals) without a filter,
//   and only the selected audiences' entries with one, labelled with the
//   audience when 2+ audiences are shown;
// - breakdown lists show every entry without a filter, and only the selected
//   audiences' entries with one;
// - columns keep the untagged ones plus the selected audiences' ones.
// Values are never added up across audiences, and tags are never shown.
//
// The same filter narrows the Reporting Dashboard's live data to the
// campaigns of the selected audiences; the API does that part.

// The selection the API applies: the selected options in their order, and
// none when every option is selected, since that is the same as no filter.
// For Reporting data the options are the audiences, then Untagged, so every
// audience without Untagged still leaves out untagged campaigns. For entered
// content they are the audiences only: untagged rows are the totals, not an
// audience.
export function appliedSelection(
  optionCodes: readonly string[],
  selected: readonly string[],
) {
  const kept = optionCodes.filter((code) => selected.includes(code));
  return kept.length === optionCodes.length ? [] : kept;
}

type Content = Record<string, unknown>;
type Kind = "summary" | "breakdown" | "columns";

// Taggable lists per render type, the first being the one that leaves the
// widget empty.
const lists: Record<string, Record<string, Kind>> = {
  kpi_list: { items: "summary" },
  field_table: { rows: "summary" },
  progress_list: { items: "breakdown", footer: "summary" },
  bar_chart: { items: "breakdown" },
  donut: { items: "breakdown" },
  heatmap: { rows: "breakdown" },
  data_table: { rows: "breakdown", columns: "columns" },
};

export const audienceLabelSeparator = " – ";

// Render types whose rows, items or columns can carry an audience.
export function isAudienceTaggable(type: string | null) {
  return type !== null && Object.hasOwn(lists, type);
}

function audienceOf(entry: unknown) {
  if (typeof entry !== "object" || entry === null) return null;
  const audience = (entry as Content).audience;
  return typeof audience === "string" && audience !== "" ? audience : null;
}

function untagged(entry: unknown) {
  if (typeof entry !== "object" || entry === null || Array.isArray(entry))
    return entry;
  const copy = { ...(entry as Content) };
  delete copy.audience;
  return copy;
}

function ofAudiences(entries: unknown[], selected: readonly string[]) {
  return entries.filter((entry) => {
    const audience = audienceOf(entry);
    return audience !== null && selected.includes(audience);
  });
}

function summary(entries: unknown[], selected: readonly string[]) {
  if (selected.length > 0) return ofAudiences(entries, selected);
  const totals = entries.filter((entry) => audienceOf(entry) === null);
  return totals.length > 0 ? totals : entries;
}

function withAudienceLabels(
  entries: unknown[],
  labelKey: string,
  labels: Readonly<Record<string, string>>,
) {
  const codes = new Set(
    entries.map(audienceOf).filter((code) => code !== null),
  );
  if (codes.size < 2) return entries;
  return entries.map((entry) => {
    const code = audienceOf(entry);
    const label = (entry as Content | null)?.[labelKey];
    if (code === null || typeof label !== "string") return entry;
    return {
      ...(entry as Content),
      [labelKey]: `${label}${audienceLabelSeparator}${labels[code] ?? code}`,
    };
  });
}

// The content as shown for the selection, or null when nothing is left to
// show. An empty selection means no filter.
export function filterByAudience(
  type: string | null,
  content: Content,
  selected: readonly string[],
  labels: Readonly<Record<string, string>>,
): Content | null {
  const typeLists = (type && lists[type]) || {};
  const next: Content = { ...content };
  const isFiltered = selected.length > 0;
  let removedColumns: string[] = [];

  for (const [list, kind] of Object.entries(typeLists)) {
    if (!Array.isArray(next[list])) continue;
    let entries = next[list] as unknown[];
    if (entries.some((entry) => audienceOf(entry) !== null)) {
      let kept: unknown[];
      if (kind === "summary") kept = summary(entries, selected);
      else if (kind === "breakdown")
        kept = isFiltered ? ofAudiences(entries, selected) : entries;
      else
        kept = isFiltered
          ? entries.filter((column) => {
              const audience = audienceOf(column);
              return audience === null || selected.includes(audience);
            })
          : entries;
      if (kind === "columns") {
        const keyOf = (column: unknown) =>
          String((column as Content | null)?.key ?? "");
        const keptKeys = new Set(kept.map(keyOf));
        removedColumns = entries.map(keyOf).filter((key) => !keptKeys.has(key));
      }
      if (kind === "summary")
        kept = withAudienceLabels(
          kept,
          type === "field_table" ? "field" : "label",
          labels,
        );
      entries = kept;
    }
    next[list] = entries.map(untagged);
  }

  if (removedColumns.length > 0 && Array.isArray(next.rows))
    next.rows = (next.rows as unknown[]).map((row) =>
      typeof row === "object" && row !== null
        ? Object.fromEntries(
            Object.entries(row as Content).filter(
              ([key]) => !removedColumns.includes(key),
            ),
          )
        : row,
    );

  if (
    type === "progress_list" &&
    isFiltered &&
    Array.isArray(next.groups) &&
    next.groups.length > 0
  ) {
    const used = new Set(
      (Array.isArray(next.items) ? next.items : []).map(
        (item) => (item as Content | null)?.group,
      ),
    );
    next.groups = (next.groups as unknown[]).filter((group) =>
      used.has((group as Content | null)?.key),
    );
  }

  const main = Object.keys(typeLists)[0];
  const shown = main === undefined ? undefined : next[main];
  if (Array.isArray(shown) && shown.length === 0) return null;
  return next;
}

// Indexes of the entries an editor shows for the selection, given each
// entry's audience code ("" for untagged). Like the served content, a list
// without tags is shown whole, and so is every list without a filter. With
// one, only the selected audiences' entries are shown; `keepUntagged` keeps
// the untagged ones too, as for data table columns.
export function audienceEntriesShown(
  tags: readonly string[],
  selected: readonly string[],
  keepUntagged = false,
) {
  const indexes = tags.map((_, index) => index);
  if (selected.length === 0 || !tags.some((tag) => tag !== "")) return indexes;
  return indexes.filter((index) => {
    const tag = tags[index] ?? "";
    return tag === "" ? keepUntagged : selected.includes(tag);
  });
}
