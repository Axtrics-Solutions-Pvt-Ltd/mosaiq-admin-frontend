import { WorkspaceDetails } from "@/features/workspaces/WorkspaceDetails";
function positive(value: string | string[] | undefined) {
  const number = Number(value);
  return typeof value === "string" && Number.isSafeInteger(number) && number > 0
    ? number
    : 0;
}
export default async function WorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [route, query] = await Promise.all([params, searchParams]);
  return (
    <WorkspaceDetails
      workspaceId={positive(route.workspaceId)}
      agencyId={positive(query.agency)}
      clientId={positive(query.client)}
    />
  );
}
