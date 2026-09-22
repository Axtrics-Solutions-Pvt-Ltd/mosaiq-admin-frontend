import { ClientDirectory } from "@/features/clients/ClientDirectory";

function single(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}
function positive(value: string | undefined) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : undefined;
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const status = single(params.status);
  const page = positive(single(params.page));
  return (
    <ClientDirectory
      filters={{
        search: single(params.search) ?? "",
        status: status === "active" || status === "inactive" ? status : "all",
        agency: positive(single(params.agency)),
        page: page ?? 1,
      }}
    />
  );
}
