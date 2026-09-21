import { InvitationDirectory } from "@/features/invitations/InvitationDirectory";

function positive(value: string | string[] | undefined) {
  const number = Number(typeof value === "string" ? value : undefined);
  return Number.isSafeInteger(number) && number > 0 ? number : undefined;
}

export default async function PendingInvitationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return (
    <InvitationDirectory
      page={positive(params.page) ?? 1}
      requestedAgencyId={positive(params.agency)}
    />
  );
}
