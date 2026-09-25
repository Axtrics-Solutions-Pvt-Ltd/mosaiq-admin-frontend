import { ClientDetailsScreen } from "@/features/clients/ClientDetails";
import { correctionFilterParams } from "@/features/corrections/filters";

function positive(value: string | string[] | undefined) {
  const number = Number(value);
  return typeof value === "string" && Number.isSafeInteger(number) && number > 0
    ? number
    : 0;
}

export default async function ClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [route, query] = await Promise.all([params, searchParams]);
  const metric = query[correctionFilterParams.metric];
  return (
    <ClientDetailsScreen
      clientId={positive(route.clientId)}
      agencyId={positive(query.agency)}
      correctionFilters={{
        workspaceId:
          positive(query[correctionFilterParams.workspace]) || undefined,
        metricCode: typeof metric === "string" ? metric : undefined,
        page: positive(query[correctionFilterParams.page]) || 1,
      }}
    />
  );
}
