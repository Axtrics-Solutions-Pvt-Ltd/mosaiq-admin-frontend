import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageStack } from "@/components/shared/LayoutPatterns";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatePanel } from "@/components/shared/StatePanel";
import { Button } from "@/components/ui/Button";
import { getNavigationItem } from "@/config/navigation";
import { routes } from "@/config/routes";

// Only navigation destinations without their own page get a placeholder;
// any other path, including retired screens, is a 404.
export default async function PlaceholderPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const item = getNavigationItem(`/${slug.join("/")}`);
  if (!item) notFound();
  const title = item.label;
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
