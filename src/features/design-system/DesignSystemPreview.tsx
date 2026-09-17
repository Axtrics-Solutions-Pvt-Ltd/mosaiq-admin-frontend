"use client";
import { Bell, Plus } from "lucide-react";
import { useState } from "react";

import { ConfirmationDialog } from "@/components/shared/ConfirmationDialog";
import {
  CardGrid,
  FilterBar,
  FormGrid,
  PageSection,
  PageSectionHeading,
  PageStack,
  TableSurface,
} from "@/components/shared/LayoutPatterns";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatePanel } from "@/components/shared/StatePanel";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { Dialog } from "@/components/ui/Dialog";
import { Drawer } from "@/components/ui/Drawer";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { Toast } from "@/components/ui/Toast";
import { Tooltip } from "@/components/ui/Tooltip";
export function DesignSystemPreview() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  return (
    <PageStack>
      <PageHeader
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" />
            Open dialog
          </Button>
        }
        description="Review reusable controls, states, overlays, and layout patterns before feature screens are added."
        isPreview
        title="Design system"
      />
      <PageSection>
        <PageSectionHeading>Actions and status</PageSectionHeading>
        <Card>
          <CardContent className="space-y-5 pt-4 sm:pt-5">
            <div className="flex flex-wrap gap-2">
              <Button>Primary action</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button disabled>Disabled</Button>
              <Tooltip content="Notifications preview">
                <Button
                  aria-label="Notifications"
                  size="icon"
                  variant="outline"
                >
                  <Bell className="size-4" />
                </Button>
              </Tooltip>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status="active" />
              <StatusBadge status="invited" />
              <StatusBadge status="processing" />
              <StatusBadge status="warning" />
              <StatusBadge status="failed" />
              <Badge>Neutral badge</Badge>
            </div>
          </CardContent>
        </Card>
      </PageSection>
      <div className="grid gap-6 xl:grid-cols-2">
        <PageSection>
          <PageSectionHeading>Form controls</PageSectionHeading>
          <Card>
            <CardContent className="pt-4 sm:pt-5">
              <FormGrid>
                <FormField
                  description="Used for account notifications."
                  id="preview-email"
                  label="Email address"
                  required
                >
                  <Input
                    aria-describedby="preview-email-description"
                    id="preview-email"
                    placeholder="admin@example.com"
                    type="email"
                  />
                </FormField>
                <FormField
                  error="Enter a valid workspace name."
                  id="preview-workspace"
                  label="Workspace"
                >
                  <Input
                    aria-describedby="preview-workspace-error"
                    aria-invalid
                    id="preview-workspace"
                    defaultValue=""
                  />
                </FormField>
                <FormField id="preview-agency" label="Agency">
                  <Select id="preview-agency">
                    <option>Northstar Digital</option>
                    <option>Kinetic Growth</option>
                  </Select>
                </FormField>
                <div className="space-y-2">
                  <Label htmlFor="preview-checkbox">Preferences</Label>
                  <label
                    className="flex items-center gap-2"
                    htmlFor="preview-checkbox"
                  >
                    <Checkbox defaultChecked id="preview-checkbox" />
                    Show demo indicators
                  </label>
                </div>
              </FormGrid>
            </CardContent>
          </Card>
        </PageSection>
        <PageSection>
          <PageSectionHeading>Tabs and feedback</PageSectionHeading>
          <Card>
            <CardContent className="pt-4 sm:pt-5">
              <Tabs
                items={[
                  {
                    value: "overview",
                    label: "Overview",
                    content: (
                      <Toast title="Preview is ready">
                        This message describes a local UI state.
                      </Toast>
                    ),
                  },
                  {
                    value: "loading",
                    label: "Loading",
                    content: (
                      <div className="space-y-3">
                        <Skeleton className="h-5 w-2/5" />
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-5 w-3/5" />
                      </div>
                    ),
                  },
                  {
                    value: "controls",
                    label: "Overlays",
                    content: (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          onClick={() => setDrawerOpen(true)}
                          variant="outline"
                        >
                          Open drawer
                        </Button>
                        <Button
                          onClick={() => setConfirmOpen(true)}
                          variant="destructive"
                        >
                          Open confirmation
                        </Button>
                      </div>
                    ),
                  },
                ]}
              />
            </CardContent>
          </Card>
        </PageSection>
      </div>
      <PageSection>
        <PageSectionHeading>Operational patterns</PageSectionHeading>
        <FilterBar>
          <FormField id="filter-search" label="Search">
            <Input id="filter-search" placeholder="Search sample records" />
          </FormField>
          <FormField id="filter-status" label="Status">
            <Select id="filter-status">
              <option>All statuses</option>
              <option>Active</option>
            </Select>
          </FormField>
          <Button className="sm:mb-0" disabled>
            Apply filters
          </Button>
        </FilterBar>
        <TableSurface>
          <table className="w-full min-w-[36rem] text-left">
            <caption className="sr-only">Sample agencies</caption>
            <thead className="bg-muted text-muted-foreground border-b text-xs">
              <tr>
                <th className="px-4 py-3">Agency</th>
                <th className="px-4 py-3">Workspaces</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="text-strong px-4 py-3 font-medium">
                  Northstar Digital
                </td>
                <td className="px-4 py-3 tabular-nums">8</td>
                <td className="px-4 py-3">
                  <StatusBadge status="active" />
                </td>
              </tr>
            </tbody>
          </table>
        </TableSurface>
      </PageSection>
      <PageSection>
        <PageSectionHeading>Content states</PageSectionHeading>
        <CardGrid className="xl:grid-cols-2">
          <StatePanel
            action={<Button variant="outline">Create first agency</Button>}
            description="Start by adding an agency to the administration workspace."
            kind="empty"
            title="No agencies yet"
          />
          <StatePanel
            action={<Button variant="outline">Clear filters</Button>}
            description="Adjust or clear the current filters to see more records."
            kind="no-results"
            title="No matching results"
          />
          <StatePanel
            description="Your current role cannot view this content."
            kind="permission"
            title="Access restricted"
          />
          <StatePanel
            description="This integration is planned but is not available in the preview."
            kind="unavailable"
            title="Connector unavailable"
          />
        </CardGrid>
      </PageSection>
      <Dialog
        description="This dialog uses the browser modal model for focus trapping and Escape behavior."
        footer={
          <>
            <Button onClick={() => setDialogOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button disabled>Save preview</Button>
          </>
        }
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Create agency preview"
      >
        <FormField id="dialog-name" label="Agency name">
          <Input autoFocus id="dialog-name" placeholder="Agency name" />
        </FormField>
      </Dialog>
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Agency details"
      >
        <p className="text-muted-foreground">
          Drawers preserve page context for supplementary details. This sample
          contains no live data.
        </p>
      </Drawer>
      <ConfirmationDialog
        description="Review the consequences before continuing."
        isOpen={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => setConfirmOpen(false)}
        title="Confirm preview action"
      />
    </PageStack>
  );
}
