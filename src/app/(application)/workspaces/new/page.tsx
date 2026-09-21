import { WorkspaceCreateScreen } from "@/features/workspaces/WorkspaceForm";
function positive(value: string | string[] | undefined) {
  const number = Number(value);
  return typeof value === "string" && Number.isSafeInteger(number) && number > 0
    ? number
    : 0;
}
export default async function NewWorkspacePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return (
    <WorkspaceCreateScreen
      agencyId={positive(params.agency)}
      clientId={positive(params.client)}
    />
  );
}
