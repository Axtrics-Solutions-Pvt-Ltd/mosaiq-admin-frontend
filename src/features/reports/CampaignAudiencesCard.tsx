"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { toast } from "@/components/ui/Toast";
import { ChannelBadge } from "@/features/channels/ChannelBadge";
import { ApiError } from "@/lib/api/errors";

import type { ReportScope } from "./api";
import {
  type Audience,
  type CampaignAudiences,
  type CampaignAudiencesRequest,
  type Report,
  untaggedAudienceCode,
} from "./contracts";
import { useCampaignAudiences, useUpdateCampaignAudiences } from "./queries";
import { useUnsavedChangesWarning } from "./useUnsavedChangesWarning";

// The draft mapping: each channel's default ("" for none), and each
// campaign's own audience by `workspaceId|campaignKey` ("" to follow its
// channel, `untagged` for General).
type Draft = {
  defaults: Record<number, string>;
  tags: Record<string, string>;
};

const campaignId = (workspaceId: number, campaignKey: string) =>
  `${workspaceId}|${campaignKey}`;

function draftOf(data: CampaignAudiences): Draft {
  const draft: Draft = { defaults: {}, tags: {} };
  for (const channel of data.channels) {
    draft.defaults[channel.workspace_id] = channel.default_audience ?? "";
    for (const campaign of channel.campaigns)
      draft.tags[campaignId(channel.workspace_id, campaign.campaign_key)] =
        campaign.audience ?? "";
  }
  return draft;
}

// The PUT body: every channel, and only the campaigns with their own audience.
export function campaignAudiencesRequest(
  data: CampaignAudiences,
  draft: Draft,
): CampaignAudiencesRequest {
  return {
    channels: data.channels.map((channel) => ({
      workspace_id: channel.workspace_id,
      default_audience: draft.defaults[channel.workspace_id] || null,
    })),
    campaigns: data.channels.flatMap((channel) =>
      channel.campaigns.flatMap((campaign) => {
        const audience =
          draft.tags[campaignId(channel.workspace_id, campaign.campaign_key)];
        return audience
          ? [
              {
                workspace_id: channel.workspace_id,
                campaign_key: campaign.campaign_key,
                audience,
              },
            ]
          : [];
      }),
    ),
  };
}

// Campaigns with no audience at all: no own audience and no channel default.
export function untaggedCampaignCount(data: CampaignAudiences, draft: Draft) {
  return data.channels.reduce(
    (count, channel) =>
      count +
      (draft.defaults[channel.workspace_id]
        ? 0
        : channel.campaigns.filter(
            (campaign) =>
              !draft.tags[
                campaignId(channel.workspace_id, campaign.campaign_key)
              ],
          ).length),
    0,
  );
}

function CampaignAudiencesForm({
  audiences,
  data,
  scope,
}: {
  audiences: readonly Audience[];
  data: CampaignAudiences;
  scope: ReportScope;
}) {
  const mutation = useUpdateCampaignAudiences(scope);
  const [initial] = useState(() => draftOf(data));
  const [draft, setDraft] = useState(initial);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [bulkAudience, setBulkAudience] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string>();
  const isDirty = JSON.stringify(draft) !== JSON.stringify(initial);
  useUnsavedChangesWarning(isDirty);
  const untagged = untaggedCampaignCount(data, draft);
  const labelOf = (code: string) =>
    audiences.find((audience) => audience.code === code)?.label ??
    "Unknown audience";
  const query = search.trim().toLowerCase();
  const channels = data.channels.map((channel) => ({
    ...channel,
    shown: channel.campaigns.filter(
      (campaign) => !query || campaign.name.toLowerCase().includes(query),
    ),
  }));

  function setDefault(workspaceId: number, audience: string) {
    setDraft((current) => ({
      ...current,
      defaults: { ...current.defaults, [workspaceId]: audience },
    }));
  }

  function setTags(ids: Iterable<string>, audience: string) {
    setDraft((current) => {
      const tags = { ...current.tags };
      for (const id of ids) tags[id] = audience;
      return { ...current, tags };
    });
  }

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save() {
    setError(undefined);
    try {
      await mutation.mutateAsync(campaignAudiencesRequest(data, draft));
      toast({ title: "Campaign audiences saved", tone: "success" });
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? (Object.values(caught.fieldErrors)[0] ?? caught.message)
          : "The campaign audiences could not be saved. Please try again.",
      );
    }
  }

  if (data.channels.length === 0)
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
        No source channels. Add one under Source channels first.
      </p>
    );

  return (
    <div className="space-y-4">
      {error && (
        <p
          className="text-destructive rounded-lg border p-3 text-sm"
          role="alert"
        >
          {error}
        </p>
      )}
      <p
        className={
          untagged > 0
            ? "text-warning text-sm font-medium"
            : "text-muted-foreground text-sm"
        }
        role="status"
      >
        {untagged === 0
          ? "Every campaign has an audience."
          : untagged === 1
            ? "1 campaign is not tagged."
            : `${untagged} campaigns are not tagged.`}
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-60 flex-1">
          <FormField id="campaign-audience-search" label="Find a campaign">
            <Input
              autoComplete="off"
              id="campaign-audience-search"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Campaign name"
              type="search"
              value={search}
            />
          </FormField>
        </div>
        <FormField
          id="campaign-audience-bulk"
          label={`Selected campaigns (${selected.size})`}
        >
          <div className="flex gap-2">
            <Select
              className="h-10 w-auto"
              disabled={selected.size === 0}
              id="campaign-audience-bulk"
              onChange={(event) => setBulkAudience(event.target.value)}
              value={bulkAudience}
            >
              <option value="">Channel default</option>
              {audiences.map((audience) => (
                <option key={audience.code} value={audience.code}>
                  {audience.label}
                </option>
              ))}
              <option value={untaggedAudienceCode}>General</option>
            </Select>
            <Button
              disabled={selected.size === 0}
              onClick={() => {
                setTags(selected, bulkAudience);
                setSelected(new Set());
              }}
              type="button"
              variant="outline"
            >
              Apply
            </Button>
          </div>
        </FormField>
      </div>
      {channels.map((channel) => {
        const channelDefault = draft.defaults[channel.workspace_id] ?? "";
        return (
          <section
            aria-label={channel.name}
            className="rounded-lg border"
            key={channel.workspace_id}
          >
            <div className="flex flex-wrap items-end justify-between gap-3 border-b p-3">
              <div className="min-w-0 space-y-1">
                <p className="text-strong font-medium">{channel.name}</p>
                <ChannelBadge
                  channel={
                    channel.platform
                      ? { name: channel.platform.name, category: "" }
                      : null
                  }
                />
              </div>
              <FormField
                id={`channel-audience-${channel.workspace_id}`}
                label="Default audience"
              >
                <Select
                  className="h-9 w-auto"
                  id={`channel-audience-${channel.workspace_id}`}
                  onChange={(event) =>
                    setDefault(channel.workspace_id, event.target.value)
                  }
                  value={channelDefault}
                >
                  <option value="">No default</option>
                  {audiences.map((audience) => (
                    <option key={audience.code} value={audience.code}>
                      {audience.label}
                    </option>
                  ))}
                  {channelDefault &&
                    !audiences.some(
                      (audience) => audience.code === channelDefault,
                    ) && (
                      <option value={channelDefault}>Unknown audience</option>
                    )}
                </Select>
              </FormField>
            </div>
            {channel.campaigns.length === 0 ? (
              <p className="text-muted-foreground p-3 text-sm">
                No campaigns. This channel&apos;s data isn&apos;t included when
                an audience is selected.
              </p>
            ) : channel.shown.length === 0 ? (
              <p className="text-muted-foreground p-3 text-sm">
                No campaigns match your search.
              </p>
            ) : (
              <ul className="divide-y">
                {channel.shown.map((campaign) => {
                  const id = campaignId(
                    channel.workspace_id,
                    campaign.campaign_key,
                  );
                  const tag = draft.tags[id] ?? "";
                  const isKnown =
                    tag === "" ||
                    tag === untaggedAudienceCode ||
                    audiences.some((audience) => audience.code === tag);
                  return (
                    <li
                      className="flex flex-wrap items-center gap-3 px-3 py-2"
                      key={id}
                    >
                      <Checkbox
                        aria-label={`Select ${campaign.name}`}
                        checked={selected.has(id)}
                        onChange={() => toggle(id)}
                      />
                      <div className="min-w-40 flex-1">
                        <p className="text-strong text-sm font-medium">
                          {campaign.name}
                        </p>
                        <p className="text-muted-foreground text-xs capitalize">
                          {campaign.status}
                        </p>
                      </div>
                      {tag === "" && channelDefault === "" && (
                        <Badge tone="warning">Untagged</Badge>
                      )}
                      <Select
                        aria-label={`Audience for ${campaign.name}`}
                        className="h-9 w-auto"
                        onChange={(event) => setTags([id], event.target.value)}
                        value={tag}
                      >
                        <option value="">
                          {`Channel default (${channelDefault ? labelOf(channelDefault) : "none"})`}
                        </option>
                        {audiences.map((audience) => (
                          <option key={audience.code} value={audience.code}>
                            {audience.label}
                          </option>
                        ))}
                        <option value={untaggedAudienceCode}>General</option>
                        {!isKnown && (
                          <option value={tag}>Unknown audience</option>
                        )}
                      </Select>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
      <div className="flex items-center justify-end gap-3 border-t pt-4">
        {isDirty && (
          <span className="text-muted-foreground text-xs">Unsaved changes</span>
        )}
        <Button
          disabled={!isDirty}
          onClick={() => {
            setDraft(initial);
            setSelected(new Set());
            setError(undefined);
          }}
          type="button"
          variant="ghost"
        >
          Discard
        </Button>
        <Button
          disabled={mutation.isPending || !isDirty}
          onClick={save}
          type="button"
        >
          {mutation.isPending ? "Saving..." : "Save campaign audiences"}
        </Button>
      </div>
    </div>
  );
}

// Which audience each campaign belongs to, so the Reporting Dashboard can be
// filtered by audience: a campaign's own, else its channel's default.
export function CampaignAudiencesCard({
  report,
  scope,
}: {
  report: Report;
  scope: ReportScope;
}) {
  const query = useCampaignAudiences(scope);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Campaign audiences</CardTitle>
        <p className="text-muted-foreground text-sm">
          The Reporting Dashboard filters by campaign. A campaign uses its own
          audience, else its channel&apos;s default. Data without a campaign
          (e.g. website analytics) isn&apos;t included when an audience is
          selected.
        </p>
      </CardHeader>
      <CardContent>
        {report.audiences.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
            Add audience segments first.
          </p>
        ) : query.isPending ? (
          <p aria-busy="true" className="text-muted-foreground text-sm">
            Loading campaigns...
          </p>
        ) : query.isError ? (
          <div className="space-y-3">
            <p className="text-destructive text-sm" role="alert">
              The campaigns could not be loaded.
            </p>
            <Button onClick={() => query.refetch()} variant="outline">
              Try again
            </Button>
          </div>
        ) : (
          <CampaignAudiencesForm
            audiences={report.audiences}
            data={query.data}
            key={JSON.stringify(query.data)}
            scope={scope}
          />
        )}
      </CardContent>
    </Card>
  );
}
