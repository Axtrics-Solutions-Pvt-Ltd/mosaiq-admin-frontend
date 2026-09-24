import { parseInvitationStatusFilter } from "@/features/invitations/contracts";
import { InvitationDirectory } from "@/features/invitations/InvitationDirectory";

function positive(value: string | string[] | undefined) {
  const number = Number(typeof value === "string" ? value : undefined);
  return Number.isSafeInteger(number) && number > 0 ? number : undefined;
}

function statusFilter(value: string | string[] | undefined) {
  return parseInvitationStatusFilter(
    typeof value === "string" ? value : undefined,
  );
}

export default async function InvitationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return (
    <InvitationDirectory
      agencyId={positive(params.agency)}
      page={positive(params.page) ?? 1}
      status={statusFilter(params.status)}
      workspaceId={positive(params.workspace)}
    />
  );
}
