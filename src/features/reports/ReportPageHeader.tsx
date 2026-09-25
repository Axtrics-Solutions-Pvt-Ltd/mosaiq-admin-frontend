"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  clientDetailUrl,
  reportLinksUrl,
  reportSettingsUrl,
  reportsIndexUrl,
  reportUrl,
} from "@/config/routes";
import { cn } from "@/lib/utils/cn";

import type { Report } from "./contracts";

export function ReportPageHeader({
  actions,
  current,
  description,
  report,
}: {
  actions?: ReactNode;
  current: "design" | "settings" | "links";
  description: string;
  report: Report;
}) {
  const clientName = report.client?.name ?? `Client #${report.client_id}`;
  const pages = [
    {
      key: "design",
      label: "Design",
      href: reportUrl(report.id, report.agency_id, report.client_id),
    },
    {
      key: "settings",
      label: "Settings",
      href: reportSettingsUrl(report.id, report.agency_id, report.client_id),
    },
    {
      key: "links",
      label: "Links",
      href: reportLinksUrl(report.id, report.agency_id, report.client_id),
    },
  ] as const;
  return (
    <div className="space-y-4">
      <PageHeader
        actions={actions}
        breadcrumbs={
          <>
            <Link
              className="hover:text-primary"
              href={reportsIndexUrl(report.agency_id, report.client_id)}
            >
              Reports
            </Link>
            <span aria-hidden> / </span>
            <Link
              className="hover:text-primary"
              href={clientDetailUrl(report.client_id, report.agency_id)}
            >
              {clientName}
            </Link>
          </>
        }
        context={clientName}
        description={description}
        title={report.name}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Report pages">
          <ul className="flex gap-1 border-b">
            {pages.map((page) => (
              <li key={page.key}>
                <Link
                  aria-current={current === page.key ? "page" : undefined}
                  className={cn(
                    "-mb-px block border-b-2 border-transparent px-3 py-2 text-sm font-medium",
                    current === page.key
                      ? "border-primary text-primary"
                      : "text-muted-foreground hover:text-strong",
                  )}
                  href={page.href}
                >
                  {page.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        {report.status === "archived" && <StatusBadge status="archived" />}
      </div>
    </div>
  );
}
