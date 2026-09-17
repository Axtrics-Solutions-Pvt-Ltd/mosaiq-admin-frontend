import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { PageStack } from "@/components/shared/LayoutPatterns";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatePanel } from "@/components/shared/StatePanel";
import { Button } from "@/components/ui/Button";
import { navigationItems } from "@/config/navigation";
import { routes } from "@/config/routes";
function titleFromSlug(slug: string[]) {
  const path = `/${slug.join("/")}`;
  const item = navigationItems.find(
    (entry) => path === entry.href || path.startsWith(`${entry.href}/`),
  );
  return (
    item?.label ??
    slug
      .at(-1)
      ?.replaceAll("-", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase()) ??
    "Preview"
  );
}
export default async function PlaceholderPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const title = titleFromSlug(slug);
  return (
    <PageStack>
      <PageHeader
        context="All agencies"
        description={`The ${title.toLowerCase()} screen is scheduled for its feature phase. This route is ready for navigation and shell review.`}
        isPreview
        title={title}
      />
      <StatePanel
        action={
          <Button asChild variant="outline">
            <Link href={routes.dashboard}>
              <ArrowLeft className="size-4" />
              Return to dashboard
            </Link>
          </Button>
        }
        description="The shared shell, scope controls, responsive behavior, and route composition are available now. Feature content will be added in its planned phase."
        kind="unavailable"
        title="Feature preview coming in a later phase"
      />
    </PageStack>
  );
}
