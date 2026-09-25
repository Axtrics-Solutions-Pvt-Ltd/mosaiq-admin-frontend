import { assignableAgencyRoles } from "@/config/permissions";
import { UserDirectory } from "@/features/users/UserDirectory";

function positive(value: string | string[] | undefined) {
  const number = Number(typeof value === "string" ? value : undefined);
  return Number.isSafeInteger(number) && number > 0 ? number : undefined;
}

function text(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

const statuses = ["all", "invited", "active", "inactive"] as const;
function status(value: string | string[] | undefined) {
  const candidate = typeof value === "string" ? value : "all";
  return statuses.includes(candidate as (typeof statuses)[number])
    ? (candidate as (typeof statuses)[number])
    : "all";
}

const roles = ["all", ...assignableAgencyRoles] as const;
function role(value: string | string[] | undefined) {
  const candidate = typeof value === "string" ? value : "all";
  return roles.includes(candidate as (typeof roles)[number])
    ? (candidate as (typeof roles)[number])
    : "all";
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return (
    <UserDirectory
      page={positive(params.page) ?? 1}
      search={text(params.search)}
      status={status(params.status)}
      role={role(params.role)}
    />
  );
}
