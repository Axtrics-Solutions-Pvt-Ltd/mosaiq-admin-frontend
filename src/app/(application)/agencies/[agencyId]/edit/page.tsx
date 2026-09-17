import { notFound } from "next/navigation";

import { AgencyForm } from "@/features/agencies/AgencyForm";
import { getAgency } from "@/features/agencies/view-model";

export default async function EditAgencyPage({
  params,
}: {
  params: Promise<{ agencyId: string }>;
}) {
  const { agencyId } = await params;
  const agency = getAgency(agencyId);
  if (!agency) notFound();
  return <AgencyForm agency={agency} mode="edit" />;
}
