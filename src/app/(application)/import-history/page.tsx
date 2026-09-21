import { ImportHistoryDirectory } from "@/features/data-import/ImportHistoryDirectory";

function positive(value: string | string[] | undefined) {
  const number = Number(typeof value === "string" ? value : undefined);
  return Number.isSafeInteger(number) && number > 0 ? number : undefined;
}

function text(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

export default async function ImportHistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return (
    <ImportHistoryDirectory
      dateFrom={text(params.date_from)}
      dateTo={text(params.date_to)}
      page={positive(params.page) ?? 1}
      status={text(params.status)}
      type={text(params.type)}
    />
  );
}
