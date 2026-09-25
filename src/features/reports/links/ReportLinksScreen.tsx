"use client";

import { Ban, ExternalLink, Pencil, Plus, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ConfirmationDialog } from "@/components/shared/ConfirmationDialog";
import { CopyButton } from "@/components/shared/CopyButton";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { PageStack } from "@/components/shared/LayoutPatterns";
import { StatePanel } from "@/components/shared/StatePanel";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { toast } from "@/components/ui/Toast";
import { routes } from "@/config/routes";
import { hasCapability } from "@/features/auth/contracts";
import { useCurrentUser } from "@/features/auth/queries";
import { ApiError } from "@/lib/api/errors";
import { formatDateTime, formatNumber } from "@/lib/formatters";

import type { ReportScope } from "../api";
import type { Report } from "../contracts";
import { useReport } from "../queries";
import { ReportPageHeader } from "../ReportPageHeader";
import { activeLinkCount, type ShareLink } from "./contracts";
import {
  useRegenerateShareLink,
  useRevokeShareLink,
  useShareLinks,
} from "./queries";
import { CreatedLinkDrawer, ShareLinkDrawer } from "./ShareLinkDrawer";

type DrawerState =
  { kind: "create" } | { kind: "edit"; link: ShareLink } | null;
type PendingAction = { kind: "revoke" | "regenerate"; link: ShareLink } | null;

const linkName = (link: ShareLink) => link.label ?? link.slug;
const dateOrDash = (value: string | null) =>
  value ? formatDateTime(value) : "--";

function LinkUrl({ link }: { link: ShareLink }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span
        className={
          link.status === "revoked"
            ? "text-muted-foreground font-mono text-xs break-all line-through"
            : "font-mono text-xs break-all"
        }
      >
        {link.url}
      </span>
      {link.status !== "revoked" && (
        <CopyButton
          label={`Copy URL of ${linkName(link)}`}
          size="icon"
          value={link.url}
        />
      )}
    </span>
  );
}

function LinksTable({
  links,
  onEdit,
  onPending,
}: {
  links: readonly ShareLink[];
  onEdit: (link: ShareLink) => void;
  onPending: (action: NonNullable<PendingAction>) => void;
}) {
  const actions = (link: ShareLink) => {
    const isRevoked = link.status === "revoked";
    const name = linkName(link);
    return (
      <div className="flex flex-wrap items-center justify-end gap-1">
        <Button
          aria-label={`Edit ${name}`}
          disabled={isRevoked}
          onClick={() => onEdit(link)}
          size="icon"
          variant="ghost"
        >
          <Pencil aria-hidden className="size-4" />
        </Button>
        <Button
          aria-label={`Regenerate ${name}`}
          disabled={isRevoked}
          onClick={() => onPending({ kind: "regenerate", link })}
          size="icon"
          variant="ghost"
        >
          <RefreshCw aria-hidden className="size-4" />
        </Button>
        <Button
          aria-label={`Revoke ${name}`}
          disabled={isRevoked}
          onClick={() => onPending({ kind: "revoke", link })}
          size="icon"
          variant="ghost"
        >
          <Ban aria-hidden className="text-destructive size-4" />
        </Button>
        {isRevoked ? (
          <Button
            aria-label={`Open ${name} in the portal`}
            disabled
            size="icon"
            variant="ghost"
          >
            <ExternalLink aria-hidden className="size-4" />
          </Button>
        ) : (
          <Button asChild size="icon" variant="ghost">
            <a
              aria-label={`Open ${name} in the portal (new tab)`}
              href={link.url}
              rel="noopener noreferrer"
              target="_blank"
            >
              <ExternalLink aria-hidden className="size-4" />
            </a>
          </Button>
        )}
      </div>
    );
  };

  const columns: readonly DataTableColumn<ShareLink>[] = [
    {
      id: "label",
      header: "Label",
      render: (link) =>
        link.label ? (
          <span className="text-strong font-medium">{link.label}</span>
        ) : (
          <span className="text-muted-foreground">No label</span>
        ),
    },
    { id: "url", header: "URL", render: (link) => <LinkUrl link={link} /> },
    {
      id: "password",
      header: "Password",
      render: (link) => (link.has_password ? "Yes" : "No"),
    },
    {
      id: "expires",
      header: "Expires",
      render: (link) =>
        link.expires_at ? formatDateTime(link.expires_at) : "Never",
    },
    {
      id: "status",
      header: "Status",
      render: (link) => <StatusBadge status={link.status} />,
    },
    {
      id: "views",
      header: "Views",
      align: "right",
      render: (link) => formatNumber(link.view_count),
    },
    {
      id: "last-viewed",
      header: "Last viewed",
      render: (link) => dateOrDash(link.last_viewed_at),
    },
    {
      id: "created-by",
      header: "Created by",
      render: (link) => (
        <span className="text-sm">
          {link.created_by?.name ?? "--"}
          {link.created_at && (
            <span className="text-muted-foreground block text-xs">
              {formatDateTime(link.created_at)}
            </span>
          )}
        </span>
      ),
    },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      render: actions,
    },
  ];

  return (
    <DataTable
      caption="Share links"
      columns={columns}
      getRowKey={(link) => String(link.id)}
      mobileCard={(link) => (
        <Card>
          <CardContent className="space-y-3 pt-5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-strong font-semibold">
                {link.label ?? "No label"}
              </p>
              <StatusBadge status={link.status} />
            </div>
            <LinkUrl link={link} />
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Password</dt>
              <dd>{link.has_password ? "Yes" : "No"}</dd>
              <dt className="text-muted-foreground">Expires</dt>
              <dd>
                {link.expires_at ? formatDateTime(link.expires_at) : "Never"}
              </dd>
              <dt className="text-muted-foreground">Views</dt>
              <dd>{formatNumber(link.view_count)}</dd>
              <dt className="text-muted-foreground">Last viewed</dt>
              <dd>{dateOrDash(link.last_viewed_at)}</dd>
              <dt className="text-muted-foreground">Created by</dt>
              <dd>{link.created_by?.name ?? "--"}</dd>
            </dl>
            {actions(link)}
          </CardContent>
        </Card>
      )}
      rows={links}
    />
  );
}

function LinksContent({
  report,
  scope,
}: {
  report: Report;
  scope: ReportScope;
}) {
  const links = useShareLinks(scope);
  const revokeMutation = useRevokeShareLink(scope);
  const regenerateMutation = useRegenerateShareLink(scope);
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [pending, setPending] = useState<PendingAction>(null);
  const [regenerated, setRegenerated] = useState<ShareLink>();

  async function confirmPending() {
    if (!pending) return;
    const { kind, link } = pending;
    try {
      if (kind === "revoke") {
        await revokeMutation.mutateAsync(link.id);
        toast({
          title: "Link revoked",
          description: linkName(link),
          tone: "success",
        });
      } else {
        setRegenerated(await regenerateMutation.mutateAsync(link.id));
        toast({ title: "Link regenerated", tone: "success" });
      }
    } catch (error) {
      toast({
        title: kind === "revoke" ? "Link not revoked" : "Link not regenerated",
        description:
          error instanceof ApiError
            ? error.message
            : "The link could not be changed. Please try again.",
        tone: "error",
      });
    }
    setPending(null);
  }

  const createButton = (
    <Button onClick={() => setDrawer({ kind: "create" })}>
      <Plus aria-hidden className="size-4" /> Create link
    </Button>
  );

  return (
    <>
      {report.status === "archived" && (
        <p className="text-warning rounded-lg border p-3 text-sm" role="status">
          This report is archived. Links on an archived report don&apos;t open
          until the report is restored, and they aren&apos;t counted as active.
          Their badges below show how each link behaves once the report is
          restored.
        </p>
      )}
      {links.isPending && <p aria-busy="true">Loading links...</p>}
      {links.isError && (
        <StatePanel
          action={<Button onClick={() => links.refetch()}>Try again</Button>}
          description={
            links.error instanceof ApiError && links.error.status === 403
              ? "You do not have permission to manage this report's links."
              : "The links could not be loaded."
          }
          kind={
            links.error instanceof ApiError && links.error.status === 403
              ? "permission"
              : "error"
          }
          title="Links unavailable"
        />
      )}
      {links.isSuccess && links.data.length === 0 && (
        <StatePanel
          action={createButton}
          description="Create a link to share this report with the client portal. You can protect it with a password and let it expire."
          kind="empty"
          title="No links yet"
        />
      )}
      {links.isSuccess && links.data.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-muted-foreground text-sm">
              {report.status === "archived"
                ? `${links.data.length} links, paused while archived.`
                : `${activeLinkCount(links.data)} active of ${links.data.length} links.`}{" "}
              Revoked links stay listed.
            </p>
            {createButton}
          </div>
          <LinksTable
            links={links.data}
            onEdit={(link) => setDrawer({ kind: "edit", link })}
            onPending={setPending}
          />
        </>
      )}
      {drawer && (
        <ShareLinkDrawer
          key={drawer.kind === "edit" ? drawer.link.id : "create"}
          link={drawer.kind === "edit" ? drawer.link : undefined}
          onClose={() => setDrawer(null)}
          scope={scope}
        />
      )}
      <ConfirmationDialog
        body={
          pending ? (
            <p>
              Link:{" "}
              <span className="text-strong font-medium">
                {linkName(pending.link)}
              </span>
            </p>
          ) : undefined
        }
        confirmLabel={
          pending?.kind === "regenerate" ? "Regenerate link" : "Revoke link"
        }
        description={
          pending?.kind === "regenerate"
            ? "The old URL stops working and a new URL is created with the same settings."
            : "Anyone with this link loses access immediately."
        }
        isOpen={Boolean(pending)}
        isPending={revokeMutation.isPending || regenerateMutation.isPending}
        onCancel={() => setPending(null)}
        onConfirm={confirmPending}
        title={
          pending?.kind === "regenerate"
            ? "Regenerate this link?"
            : "Revoke this link?"
        }
      />
      {regenerated && (
        <CreatedLinkDrawer
          link={regenerated}
          onClose={() => setRegenerated(undefined)}
          title="Link regenerated"
        />
      )}
    </>
  );
}

export function ReportLinksScreen({
  agencyId,
  clientId,
  reportId,
}: {
  agencyId: number;
  clientId: number;
  reportId: number;
}) {
  const scope = { agencyId, clientId, reportId };
  const user = useCurrentUser();
  const report = useReport(scope);
  if (
    ![agencyId, clientId, reportId].every(
      (id) => Number.isSafeInteger(id) && id > 0,
    )
  )
    return (
      <StatePanel
        action={
          <Button asChild>
            <Link href={routes.reports.index}>Open reports</Link>
          </Button>
        }
        description="Open this report from the reports list."
        kind="error"
        title="Report scope required"
      />
    );
  if (user.isPending || report.isPending)
    return <p aria-busy="true">Loading report...</p>;
  if (!(user.data && hasCapability(user.data, "reports.manage")))
    return (
      <StatePanel
        description="You do not have permission to share reports."
        kind="permission"
        title="Report links unavailable"
      />
    );
  if (report.isError)
    return (
      <StatePanel
        action={<Button onClick={() => report.refetch()}>Try again</Button>}
        description="The report could not be loaded."
        kind="error"
        title="Report unavailable"
      />
    );
  return (
    <PageStack>
      <ReportPageHeader
        current="links"
        description="Share this report with the client portal. Each link can have its own password and expiry, and can be revoked at any time."
        report={report.data}
      />
      <LinksContent report={report.data} scope={scope} />
    </PageStack>
  );
}
