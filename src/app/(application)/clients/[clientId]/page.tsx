import { ClientDetailsScreen } from "@/features/clients/ClientDetails";

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
  return (
    <ClientDetailsScreen
      clientId={positive(route.clientId)}
      agencyId={positive(query.agency)}
    />
  );
}
