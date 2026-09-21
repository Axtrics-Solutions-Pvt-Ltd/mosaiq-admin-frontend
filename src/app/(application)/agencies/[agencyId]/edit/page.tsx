import { AgencyEditScreen } from "@/features/agencies/AgencyForm";

export default async function EditAgencyPage({
  params,
}: {
  params: Promise<{ agencyId: string }>;
}) {
  const { agencyId } = await params;
  return <AgencyEditScreen agencyId={Number(agencyId)} />;
}
