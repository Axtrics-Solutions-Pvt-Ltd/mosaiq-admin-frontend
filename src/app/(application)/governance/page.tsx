import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { PageStack } from "@/components/shared/LayoutPatterns";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatePanel } from "@/components/shared/StatePanel";
import { Button } from "@/components/ui/Button";
import { routes } from "@/config/routes";

// Placeholder until the audit & settings screen ships. This is a dedicated
// route rather than a root catch-all so it can never shadow /api handlers.
export default function GovernancePage() {
  const title = "Audit & settings";
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
