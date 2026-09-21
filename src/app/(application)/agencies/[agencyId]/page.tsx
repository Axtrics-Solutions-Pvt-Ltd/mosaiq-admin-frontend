import { AgencyDetailsScreen } from "@/features/agencies/AgencyDetails";

export default async function AgencyPage({
  params,
}: {
  params: Promise<{ agencyId: string }>;
}) {
  const { agencyId } = await params;
  return <AgencyDetailsScreen agencyId={Number(agencyId)} />;
}
