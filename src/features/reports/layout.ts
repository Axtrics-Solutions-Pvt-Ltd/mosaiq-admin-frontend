import type { LayoutItem, ReorderItem } from "./contracts";

// Pure helpers over the section → tab → widget tree from `GET layout`.

export function findLayoutItem(
  items: readonly LayoutItem[],
  id: number,
): LayoutItem | undefined {
  for (const item of items) {
    if (item.id === id) return item;
    const found = findLayoutItem(item.children, id);
    if (found) return found;
  }
  return undefined;
}

// Siblings under one parent; `null` means the sections themselves.
export function siblingsOf(
  sections: readonly LayoutItem[],
  parentId: number | null,
): readonly LayoutItem[] {
  if (parentId === null) return sections;
  return findLayoutItem(sections, parentId)?.children ?? [];
}

// A section like Media Mix Model holds its widgets directly and is served as a
// single tab with the section's own code.
export function holdsWidgets(section: LayoutItem) {
  return section.children[0]?.level === "widget";
}

// The items the canvas opens as tabs within one section.
export function tabsOf(section: LayoutItem): readonly LayoutItem[] {
  return holdsWidgets(section) ? [section] : section.children;
}

export function findTab(sections: readonly LayoutItem[], tabCode: string) {
  for (const section of sections)
    for (const tab of tabsOf(section))
      if (tab.code === tabCode) return { section, tab };
  return undefined;
}

const isShown = (item: LayoutItem) => item.is_enabled && item.is_available;

// The first tab the portal would open, or the first tab at all when nothing
// is enabled yet.
export function defaultTabCode(sections: readonly LayoutItem[]) {
  for (const section of sections.filter(isShown)) {
    const tab = tabsOf(section).find(isShown);
    if (tab) return tab.code;
  }
  return sections.flatMap((section) => tabsOf(section))[0]?.code;
}

function toOrder(siblings: readonly LayoutItem[]): ReorderItem[] {
  return siblings.map((item, position) => ({
    id: item.id,
    position,
    is_enabled: item.is_enabled,
  }));
}

// The reorder payload after moving one item up (-1) or down (+1). The API
// wants every child of the parent, numbered from 0.
export function moveInOrder(
  siblings: readonly LayoutItem[],
  id: number,
  offset: -1 | 1,
): ReorderItem[] | undefined {
  const ordered = [...siblings].sort((a, b) => a.position - b.position);
  const index = ordered.findIndex((item) => item.id === id);
  const target = index + offset;
  if (index < 0 || target < 0 || target >= ordered.length) return undefined;
  const moved = [...ordered];
  [moved[index], moved[target]] = [moved[target]!, moved[index]!];
  return toOrder(moved);
}

export function toggleInOrder(
  siblings: readonly LayoutItem[],
  id: number,
  isEnabled: boolean,
): ReorderItem[] {
  return toOrder(
    [...siblings]
      .sort((a, b) => a.position - b.position)
      .map((item) =>
        item.id === id ? { ...item, is_enabled: isEnabled } : item,
      ),
  );
}

function mapTree(
  items: readonly LayoutItem[],
  update: (item: LayoutItem) => LayoutItem,
): LayoutItem[] {
  return items.map((item) =>
    update({ ...item, children: mapTree(item.children, update) }),
  );
}

// Applies a reorder payload to the cached tree, for optimistic updates.
export function applyOrder(
  sections: readonly LayoutItem[],
  order: readonly ReorderItem[],
): LayoutItem[] {
  const byId = new Map(order.map((entry) => [entry.id, entry]));
  const sortChildren = (items: LayoutItem[]) =>
    items.some((item) => byId.has(item.id))
      ? [...items].sort((a, b) => a.position - b.position)
      : items;
  const updated = mapTree(sections, (item) => {
    const entry = byId.get(item.id);
    return {
      ...(entry
        ? { ...item, position: entry.position, is_enabled: entry.is_enabled }
        : item),
      children: sortChildren(item.children),
    };
  });
  return sortChildren(updated);
}

export function setItemEnabled(
  sections: readonly LayoutItem[],
  id: number,
  isEnabled: boolean,
): LayoutItem[] {
  return mapTree(sections, (item) =>
    item.id === id ? { ...item, is_enabled: isEnabled } : item,
  );
}

// Replaces one item's own fields. The item endpoints don't return children,
// so the cached ones are kept.
export function replaceLayoutItem(
  sections: readonly LayoutItem[],
  replacement: LayoutItem,
): LayoutItem[] {
  return mapTree(sections, (item) =>
    item.id === replacement.id
      ? { ...replacement, children: item.children }
      : item,
  );
}
