import { notFound } from "next/navigation";

import { AgencyDetails } from "@/features/agencies/AgencyDetails";
import { getAgency } from "@/features/agencies/view-model";

export default async function AgencyPage({
  params,
}: {
  params: Promise<{ agencyId: string }>;
}) {
  const { agencyId } = await params;
  const agency = getAgency(agencyId);
  if (!agency) notFound();
  return <AgencyDetails agency={agency} />;
}
