import { ReportBuilder } from "@/features/reports/ReportBuilder";

function positive(value: string | string[] | undefined) {
  const number = Number(value);
  return typeof value === "string" && Number.isSafeInteger(number) && number > 0
    ? number
    : 0;
}
function single(value: string | string[] | undefined) {
  return typeof value === "string" && value ? value : undefined;
}
const isDate = (value: string | undefined) =>
  value !== undefined && /^\d{4}-\d{2}-\d{2}$/.test(value);

export default async function ReportBuilderPage({
  params,
  searchParams,
}: {
  params: Promise<{ reportId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [route, query] = await Promise.all([params, searchParams]);
  const from = single(query.from);
  const to = single(query.to);
  // A range needs both ends; otherwise the report's default range applies.
  const hasRange = isDate(from) && isDate(to);
  return (
    <ReportBuilder
      agencyId={positive(query.agency)}
      clientId={positive(query.client)}
      reportId={positive(route.reportId)}
      view={{
        tab: single(query.tab),
        from: hasRange ? from : undefined,
        to: hasRange ? to : undefined,
        channel: single(query.channel),
      }}
    />
  );
}
