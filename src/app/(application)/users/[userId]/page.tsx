import { UserDetail } from "@/features/users/UserDetail";

function positive(value: string | string[] | undefined) {
  const number = Number(typeof value === "string" ? value : undefined);
  return Number.isSafeInteger(number) && number > 0 ? number : undefined;
}

export default async function UserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { userId } = await params;
  const query = await searchParams;
  return (
    <UserDetail
      agencyId={positive(query.agency) ?? 0}
      userId={Number(userId)}
    />
  );
}
