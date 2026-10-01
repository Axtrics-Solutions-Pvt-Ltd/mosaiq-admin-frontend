import {
  AuditLogScreen,
  type AuditLogScreenFilters,
} from "@/features/audit/AuditLogScreen";
import { auditCategories } from "@/features/audit/contracts";

type Params = Record<string, string | string[] | undefined>;

function text(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

function positive(value: string | string[] | undefined) {
  const number = Number(text(value));
  return Number.isSafeInteger(number) && number > 0 ? number : undefined;
}

function date(value: string | string[] | undefined) {
  const candidate = text(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : "";
}

function category(value: string | string[] | undefined) {
  const candidate = text(value);
  return (auditCategories as readonly string[]).includes(candidate)
    ? (candidate as AuditLogScreenFilters["category"])
    : "all";
}

function result(value: string | string[] | undefined) {
  const candidate = text(value);
  return candidate === "success" || candidate === "failure" ? candidate : "all";
}

export default async function GovernancePage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  return (
    <AuditLogScreen
      category={category(params.category)}
      dateFrom={date(params.date_from)}
      dateTo={date(params.date_to)}
      page={positive(params.page) ?? 1}
      result={result(params.result)}
    />
  );
}
