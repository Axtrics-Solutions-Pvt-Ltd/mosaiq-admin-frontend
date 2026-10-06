"use client";

import { useState } from "react";

import { StatePanel } from "@/components/shared/StatePanel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { auditActionDetail, auditActionLabel } from "@/features/audit/labels";
import { formatDateTime } from "@/lib/formatters";

import { useWorkspaceActivity } from "./queries";

export function WorkspaceActivityCard({
  agencyId,
  clientId,
  workspaceId,
}: {
  agencyId: number;
  clientId: number;
  workspaceId: number;
}) {
  const [page, setPage] = useState(1);
  const activity = useWorkspaceActivity(
    { agencyId, clientId, workspaceId },
    page,
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activity.isPending ? (
          <div aria-busy="true" className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : activity.isError ? (
          <StatePanel
            kind="error"
            title="Activity unavailable"
            description="The channel activity could not be loaded."
            action={
              <Button onClick={() => activity.refetch()} variant="outline">
                Try again
              </Button>
            }
          />
        ) : activity.data.data.length === 0 ? (
          <StatePanel
            kind="empty"
            title="No activity yet"
            description="Changes to this channel, its connection, data fetches, budgets and corrections appear here."
          />
        ) : (
          <>
            <ol aria-label="Channel activity" className="divide-y">
              {activity.data.data.map((event) => {
                const detail = auditActionDetail(event);
                return (
                  <li
                    className="flex flex-wrap items-start justify-between gap-2 py-3"
                    key={event.id}
                  >
                    <div>
                      <p className="text-strong flex items-center gap-2 font-medium">
                        {auditActionLabel(event.action)}
                        {event.result === "failure" && (
                          <Badge tone="danger">Failed</Badge>
                        )}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {event.actor?.name ?? "System"}
                        {detail && <> · {detail}</>}
                      </p>
                    </div>
                    {event.created_at && (
                      <time
                        className="text-muted-foreground text-xs whitespace-nowrap"
                        dateTime={event.created_at}
                      >
                        {formatDateTime(event.created_at)}
                      </time>
                    )}
                  </li>
                );
              })}
            </ol>
            {activity.data.meta.last_page > 1 && (
              <div className="flex items-center justify-between gap-3">
                <p className="text-muted-foreground text-sm">
                  Page {activity.data.meta.current_page} of{" "}
                  {activity.data.meta.last_page}
                </p>
                <div className="flex gap-2">
                  <Button
                    disabled={page <= 1 || activity.isFetching}
                    onClick={() => setPage((current) => current - 1)}
                    size="sm"
                    variant="outline"
                  >
                    Newer
                  </Button>
                  <Button
                    disabled={
                      page >= activity.data.meta.last_page ||
                      activity.isFetching
                    }
                    onClick={() => setPage((current) => current + 1)}
                    size="sm"
                    variant="outline"
                  >
                    Older
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
