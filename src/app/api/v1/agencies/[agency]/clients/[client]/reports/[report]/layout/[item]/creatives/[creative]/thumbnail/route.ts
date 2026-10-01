import {
  creativeKeyPattern,
  creativeThumbnailProblem,
} from "@/features/reports/contracts";
import { forwardAdminUpload } from "@/lib/api/admin-server";
import { forwardAgencyRequest } from "@/lib/api/agency-server";
import { reportPaths } from "@/lib/api/paths";
import { invalidScope, positiveRouteIds } from "@/lib/api/route-ids";

type Context = {
  params: Promise<{
    agency: string;
    client: string;
    report: string;
    item: string;
    creative: string;
  }>;
};

function decoded(segment: string) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return "";
  }
}

async function thumbnailPath(context: Context) {
  const [ids, { creative }] = await Promise.all([
    positiveRouteIds(context.params, ["agency", "client", "report", "item"]),
    context.params,
  ]);
  const key = decoded(creative);
  if (!ids || !creativeKeyPattern.test(key)) return null;
  return reportPaths.layoutItemCreativeThumbnail(
    ids.agency,
    ids.client,
    ids.report,
    ids.item,
    key,
  );
}

// The same 422 shape the API gives, so the error shows on the file field.
const refused = (message: string) =>
  Response.json({ message, errors: { file: [message] } }, { status: 422 });

export async function POST(request: Request, context: Context) {
  const path = await thumbnailPath(context);
  if (!path) return invalidScope();
  let incoming: FormData;
  try {
    incoming = await request.formData();
  } catch {
    return Response.json({ message: "Invalid upload." }, { status: 400 });
  }
  const file = incoming.get("file");
  if (!(file instanceof File)) return refused("Choose an image to upload.");
  const problem = creativeThumbnailProblem(file);
  if (problem) return refused(problem);
  const outgoing = new FormData();
  outgoing.append("file", file, file.name);
  return forwardAdminUpload(request, path, outgoing);
}

export async function DELETE(request: Request, context: Context) {
  const path = await thumbnailPath(context);
  if (!path) return invalidScope();
  return forwardAgencyRequest(request, path, "DELETE");
}
