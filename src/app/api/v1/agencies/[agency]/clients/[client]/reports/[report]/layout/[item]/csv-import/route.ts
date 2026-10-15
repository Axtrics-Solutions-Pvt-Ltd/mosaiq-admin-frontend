import { reportPaths } from "@/lib/api/paths";

import { type CsvImportContext, forwardCsvImport } from "./forward";

export function POST(request: Request, context: CsvImportContext) {
  return forwardCsvImport(request, context, reportPaths.csvImport);
}
