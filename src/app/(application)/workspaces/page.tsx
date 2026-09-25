import { WorkspaceDirectory } from "@/features/workspaces/WorkspaceDirectory";
function single(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}
function positive(value: string | undefined) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : undefined;
}
export default async function WorkspacesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const status = single(params.status);
  return (
    <WorkspaceDirectory
      filters={{
        search: single(params.search) ?? "",
        status: status === "active" || status === "inactive" ? status : "all",
        channel: positive(single(params.channel)),
        page: positive(single(params.page)) ?? 1,
      }}
    />
  );
}
