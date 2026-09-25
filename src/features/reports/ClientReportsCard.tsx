"use client";

import { Plus } from "lucide-react";
import Link from "next/link";

import { StatePanel } from "@/components/shared/StatePanel";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { newReportUrl, reportsIndexUrl, reportUrl } from "@/config/routes";
import { hasCapability } from "@/features/auth/contracts";
import { useCurrentUser } from "@/features/auth/queries";
import { formatDate } from "@/lib/formatters";

import { useReports } from "./queries";
import { ReportChannels } from "./ReportDirectory";

const recentCount = 5;

// The client's most recently updated reports, on the client detail page.
export function ClientReportsCard({
  agencyId,
  clientId,
}: {
  agencyId: number;
  clientId: number;
}) {
  const user = useCurrentUser();
  const canManage = Boolean(
    user.data && hasCapability(user.data, "reports.manage"),
  );
  const query = useReports(agencyId, clientId, { per_page: recentCount });
  if (!canManage) return null;
  const reports = query.data?.data ?? [];
  const total = query.data?.meta.total ?? 0;
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Reports</CardTitle>
          <Button asChild size="sm" variant="outline">
            <Link href={newReportUrl(agencyId, clientId)}>
              <Plus aria-hidden className="size-4" /> New report
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {query.isPending && <p aria-busy="true">Loading reports...</p>}
        {query.isError && (
          <StatePanel
            action={<Button onClick={() => query.refetch()}>Try again</Button>}
            description="The client's reports could not be loaded."
            kind="error"
            title="Reports unavailable"
          />
        )}
        {query.isSuccess && reports.length === 0 && (
          <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
            No reports yet. Create one to combine this client&apos;s channel
            workspaces for the client portal.
          </p>
        )}
        {reports.length > 0 && (
          <ul className="divide-y rounded-lg border">
            {reports.map((report) => (
              <li
                className="flex flex-wrap items-center justify-between gap-3 p-3"
                key={report.id}
              >
                <div className="min-w-0 space-y-1.5">
                  <Link
                    className="text-strong hover:text-primary font-medium"
                    href={reportUrl(report.id, agencyId, clientId)}
                  >
                    {report.name}
                  </Link>
                  <ReportChannels report={report} />
                </div>
                <div className="flex items-center gap-3 text-xs">
                  {report.updated_at && (
                    <span className="text-muted-foreground">
                      Updated {formatDate(report.updated_at)}
                    </span>
                  )}
                  <StatusBadge status={report.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
        {total > recentCount && (
          <Link
            className="text-primary text-sm hover:underline"
            href={reportsIndexUrl(agencyId, clientId)}
          >
            View all {total} reports
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
