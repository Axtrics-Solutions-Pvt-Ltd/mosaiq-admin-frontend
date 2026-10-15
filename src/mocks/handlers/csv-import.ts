import { http, HttpResponse } from "msw";

import { reportPaths } from "@/lib/api/paths";

import {
  combinedCsvName,
  csvImportApplyFixture,
  csvImportPreviewFixture,
} from "../fixtures/csv-import";

type Scope = { agencyId: number; clientId: number; reportId: number };

export const templatesZipName = "MOSAIQ-Marketing-Intelligence-Templates.zip";

// A zip with no entries: only the end-of-central-directory record.
const emptyZip = new Uint8Array(22);
emptyZip.set([0x50, 0x4b, 0x05, 0x06]);

// The check, apply and template endpoints of one scope item. The handlers
// don't read the posted files: under jsdom a File body never finishes
// streaming, so tests check what was sent at the API functions instead.
export function csvImportHandlers(
  { agencyId, clientId, reportId }: Scope,
  itemId: number,
  options: {
    preview?: () => Response;
    apply?: () => Response;
  } = {},
) {
  const calls = { preview: 0, apply: 0 };
  const handlers = [
    http.post(
      reportPaths.csvImportPreview(agencyId, clientId, reportId, itemId),
      () => {
        calls.preview += 1;
        return (
          options.preview?.() ?? HttpResponse.json(csvImportPreviewFixture())
        );
      },
    ),
    http.post(
      reportPaths.csvImport(agencyId, clientId, reportId, itemId),
      () => {
        calls.apply += 1;
        return options.apply?.() ?? HttpResponse.json(csvImportApplyFixture());
      },
    ),
    // One combined CSV, or with `format=zip` an empty zip; `X-Mock-Sample`
    // tells a test whether the example rows were asked for.
    http.get(
      reportPaths.csvTemplate(agencyId, clientId, reportId, itemId),
      ({ request }) => {
        const query = new URL(request.url).searchParams;
        const isSample = query.get("sample") === "1";
        if (query.get("format") === "zip")
          return new HttpResponse(emptyZip, {
            headers: {
              "Content-Type": "application/zip",
              "Content-Disposition": `attachment; filename="${templatesZipName}"`,
              "X-Mock-Sample": isSample ? "1" : "0",
            },
          });
        return new HttpResponse(
          [
            "# MOSAIQ Marketing Intelligence template.",
            "#tab,audience_profile,Audience Profile",
            "#card,audience_by_segment,Audience by Segment",
            "label,value,format,audience",
            ...(isSample ? ["Indian,58,percent,"] : []),
            "",
          ].join("\n"),
          {
            headers: {
              "Content-Type": "text/csv; charset=UTF-8",
              "Content-Disposition": `attachment; filename="${combinedCsvName}"`,
              "X-Mock-Sample": isSample ? "1" : "0",
            },
          },
        );
      },
    ),
  ];
  return { handlers, calls };
}
