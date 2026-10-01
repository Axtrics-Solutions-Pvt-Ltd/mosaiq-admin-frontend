import { agencyLogoTypes, maxAgencyLogoBytes } from "@/features/agencies/logo";
import { forwardAdminUpload } from "@/lib/api/admin-server";
import { forwardAgencyRequest } from "@/lib/api/agency-server";
import { agencyPaths } from "@/lib/api/paths";

type Context = { params: Promise<{ agency: string }> };

async function logoPath(context: Context) {
  const agencyId = Number((await context.params).agency);
  return Number.isSafeInteger(agencyId) && agencyId > 0
    ? agencyPaths.logo(agencyId)
    : null;
}
const invalidAgency = () =>
  Response.json({ message: "Invalid agency." }, { status: 400 });

export async function POST(request: Request, context: Context) {
  const path = await logoPath(context);
  if (!path) return invalidAgency();
  let incoming: FormData;
  try {
    incoming = await request.formData();
  } catch {
    return Response.json({ message: "Invalid upload." }, { status: 400 });
  }
  const logo = incoming.get("logo");
  if (
    !(logo instanceof File) ||
    !(agencyLogoTypes as readonly string[]).includes(logo.type) ||
    logo.size > maxAgencyLogoBytes
  )
    return Response.json(
      {
        message: "Choose a PNG, JPG or WEBP logo up to 2 MB.",
        errors: { logo: ["Choose a PNG, JPG or WEBP logo up to 2 MB."] },
      },
      { status: 422 },
    );
  const outgoing = new FormData();
  outgoing.append("logo", logo, logo.name);
  return forwardAdminUpload(request, path, outgoing);
}

export async function DELETE(request: Request, context: Context) {
  const path = await logoPath(context);
  if (!path) return invalidAgency();
  return forwardAgencyRequest(request, path, "DELETE");
}
