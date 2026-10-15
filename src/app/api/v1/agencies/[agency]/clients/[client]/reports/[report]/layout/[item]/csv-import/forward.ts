import {
  csvImportProblem,
  maxCsvImportCards,
} from "@/features/reports/contracts";
import { forwardAdminUpload } from "@/lib/api/admin-server";
import { invalidScope, positiveRouteIds } from "@/lib/api/route-ids";

export type CsvImportContext = {
  params: Promise<{
    agency: string;
    client: string;
    report: string;
    item: string;
  }>;
};

// The same 422 shape the API gives, so the error shows on its field.
const refused = (message: string, field = "files") =>
  Response.json({ message, errors: { [field]: [message] } }, { status: 422 });

// Shared by the check and the apply: the same files and `as_of`, plus the
// `cards[]` to write on apply, and nothing else, after the checks the API
// would make first.
export async function forwardCsvImport(
  request: Request,
  context: CsvImportContext,
  path: (
    agency: number,
    client: number,
    report: number,
    item: number,
  ) => string,
  { isApply = false }: { isApply?: boolean } = {},
) {
  const ids = await positiveRouteIds(context.params, [
    "agency",
    "client",
    "report",
    "item",
  ]);
  if (!ids) return invalidScope();
  let incoming: FormData;
  try {
    incoming = await request.formData();
  } catch {
    return Response.json({ message: "Invalid upload." }, { status: 400 });
  }
  const files = incoming
    .getAll("files[]")
    .filter((value): value is File => value instanceof File);
  const problem = csvImportProblem(files);
  if (problem) return refused(problem);
  const cards = isApply
    ? incoming
        .getAll("cards[]")
        .filter((value): value is string => typeof value === "string")
    : [];
  if (cards.length > maxCsvImportCards)
    return refused(`Choose at most ${maxCsvImportCards} cards.`, "cards");
  const outgoing = new FormData();
  for (const file of files) outgoing.append("files[]", file, file.name);
  const asOf = incoming.get("as_of");
  if (typeof asOf === "string" && asOf) outgoing.append("as_of", asOf);
  for (const code of cards) outgoing.append("cards[]", code);
  return forwardAdminUpload(
    request,
    path(ids.agency, ids.client, ids.report, ids.item),
    outgoing,
  );
}
