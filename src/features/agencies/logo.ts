/** Image types the agency logo endpoint accepts. SVG is refused by the API. */
export const agencyLogoTypes = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;
export const maxAgencyLogoBytes = 2 * 1024 * 1024;

/** A user-facing problem with a chosen logo file, or null when it can be uploaded. */
export function agencyLogoProblem(file: File) {
  if (!(agencyLogoTypes as readonly string[]).includes(file.type))
    return "Choose a PNG, JPG or WEBP image.";
  if (file.size > maxAgencyLogoBytes) return "Choose an image up to 2 MB.";
  return null;
}
