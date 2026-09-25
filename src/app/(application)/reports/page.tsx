import { ReportDirectory } from "@/features/reports/ReportDirectory";

function single(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}
function positive(value: string | undefined) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : 0;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const status = single(params.status);
  return (
    <ReportDirectory
      filters={{
        agencyId: positive(single(params.agency)),
        clientId: positive(single(params.client)),
        search: single(params.search) ?? "",
        status: status === "active" || status === "archived" ? status : "all",
        page: positive(single(params.page)) || 1,
      }}
    />
  );
}
