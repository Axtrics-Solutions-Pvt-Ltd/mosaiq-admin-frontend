import { AgencyDirectory } from "@/features/agencies/AgencyDirectory";
import type { AgencyFilters } from "@/features/agencies/view-model";

function single(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function AgenciesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const status = single(params.status);
  const activity = single(params.activity);
  const workspaces = single(params.workspaces);
  const page = Number(single(params.page));
  const filters: AgencyFilters = {
    search: single(params.search) ?? "",
    status: status === "active" || status === "inactive" ? status : "all",
    currency: single(params.currency) ?? "all",
    workspaces:
      workspaces === "none" ||
      workspaces === "one-to-five" ||
      workspaces === "six-plus"
        ? workspaces
        : "all",
    activity: activity === "recent" || activity === "stale" ? activity : "all",
  };
  return (
    <AgencyDirectory
      filters={filters}
      page={Number.isSafeInteger(page) && page > 0 ? page : 1}
    />
  );
}
