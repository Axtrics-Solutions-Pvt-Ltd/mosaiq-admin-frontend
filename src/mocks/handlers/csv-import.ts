import { http, HttpResponse } from "msw";

import { reportPaths } from "@/lib/api/paths";

import {
  csvImportApplyFixture,
  csvImportPreviewFixture,
} from "../fixtures/csv-import";

type Scope = { agencyId: number; clientId: number; reportId: number };

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
    http.get(
      reportPaths.csvTemplate(agencyId, clientId, reportId, itemId),
      () =>
        new HttpResponse(new Uint8Array([0x50, 0x4b, 0x03, 0x04]), {
          headers: {
            "Content-Type": "application/zip",
            "Content-Disposition":
              'attachment; filename="MOSAIQ-Marketing-Intelligence-Templates.zip"',
          },
        }),
    ),
  ];
  return { handlers, calls };
}
