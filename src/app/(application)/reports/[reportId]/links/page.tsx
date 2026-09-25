import { ReportLinksScreen } from "@/features/reports/links/ReportLinksScreen";

function positive(value: string | string[] | undefined) {
  const number = Number(value);
  return typeof value === "string" && Number.isSafeInteger(number) && number > 0
    ? number
    : 0;
}

export default async function ReportLinksPage({
  params,
  searchParams,
}: {
  params: Promise<{ reportId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [route, query] = await Promise.all([params, searchParams]);
  return (
    <ReportLinksScreen
      agencyId={positive(query.agency)}
      clientId={positive(query.client)}
      reportId={positive(route.reportId)}
    />
  );
}
