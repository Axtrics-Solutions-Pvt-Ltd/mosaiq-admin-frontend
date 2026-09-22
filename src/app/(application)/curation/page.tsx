import { WorkspaceCurationEditor } from "@/features/curation/WorkspaceCurationEditor";

function positive(value: string | string[] | undefined) {
  const number = Number(value);
  return typeof value === "string" && Number.isSafeInteger(number) && number > 0
    ? number
    : 0;
}

export default async function CurationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return (
    <WorkspaceCurationEditor
      agencyId={positive(params.agency)}
      workspaceId={positive(params.workspace)}
    />
  );
}
