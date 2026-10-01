"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Megaphone, Pencil, Search, Undo2 } from "lucide-react";
import { useDeferredValue, useId, useRef, useState } from "react";
import { type FieldError, type UseFormReturn, useWatch } from "react-hook-form";

import { ConfirmationDialog } from "@/components/shared/ConfirmationDialog";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { toast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api/errors";

import type { PreviewRange, ReportScope } from "./api";
import {
  type CreativeList,
  creativeMaxMetrics,
  creativeMaxPins,
  creativeThumbnailProblem,
  creativeThumbnailTypes,
  creativeTitleMaxLength,
  defaultCreativeMetrics,
  type LayoutItem,
  type ListedCreative,
  reportMetricCodes,
  reportMetricLabel,
} from "./contracts";
import { creativeMaxLimit, type LiveFormValues } from "./inspector-forms";
import { ListControls } from "./inspector-parts";
import {
  reportKeys,
  useCreatives,
  useRemoveCreativeThumbnail,
  useUploadCreativeThumbnail,
} from "./queries";

// Creative Performance settings in the widget inspector. Ranking, metrics,
// names, hiding and pins are form fields saved with the widget; images upload
// on their own, straight away.

type Form = UseFormReturn<LiveFormValues>;

const defaultLimit = 6;
const creativesPerPage = 10;

function CardMetrics({ form }: { form: Form }) {
  const selected = useWatch({ control: form.control, name: "metrics" });
  const isDefault = selected.length === 0;
  const shown: readonly string[] = isDefault
    ? defaultCreativeMetrics
    : selected;
  const error = form.formState.errors.metrics?.message;
  const update = (next: string[]) =>
    form.setValue("metrics", next, { shouldDirty: true, shouldValidate: true });
  const move = (from: number, to: number) => {
    const next = [...shown];
    next.splice(to, 0, ...next.splice(from, 1));
    update(next);
  };
  return (
    <fieldset className="space-y-2">
      <legend className="text-strong text-sm font-medium">
        Metrics on each card
      </legend>
      <p className="text-muted-foreground text-xs">
        Up to {creativeMaxMetrics}, in this order. The ranking metric isn&apos;t
        added for you.
      </p>
      {error && (
        <p className="text-destructive text-xs font-medium" role="alert">
          {error}
        </p>
      )}
      <ol className="space-y-1">
        {shown.map((code, index) => (
          <li
            className="flex items-center justify-between gap-2 rounded-md border py-1 pr-1 pl-3 text-sm"
            key={code}
          >
            {reportMetricLabel(code)}
            <ListControls
              count={shown.length}
              index={index}
              label={reportMetricLabel(code)}
              move={move}
              // Removing the last one goes back to the defaults.
              remove={(at) =>
                update(shown.filter((_, position) => position !== at))
              }
            />
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-40 flex-1">
          <FormField id="inspector-creative-add-metric" label="Add a metric">
            <Select
              disabled={shown.length >= creativeMaxMetrics}
              id="inspector-creative-add-metric"
              onChange={(event) => {
                if (event.target.value) update([...shown, event.target.value]);
              }}
              value=""
            >
              <option value="">
                {shown.length >= creativeMaxMetrics
                  ? `${creativeMaxMetrics} chosen`
                  : "Choose a metric"}
              </option>
              {reportMetricCodes
                .filter((code) => !shown.includes(code))
                .map((code) => (
                  <option key={code} value={code}>
                    {reportMetricLabel(code)}
                  </option>
                ))}
            </Select>
          </FormField>
        </div>
        {!isDefault && (
          <Button
            onClick={() => update([])}
            size="sm"
            type="button"
            variant="ghost"
          >
            Use defaults
          </Button>
        )}
      </div>
    </fieldset>
  );
}

function SmallThumbnail({ creative }: { creative: ListedCreative }) {
  if (creative.thumbnail_url)
    return (
      // Channel thumbnails live on ad platform hosts the image optimiser
      // can't list in advance.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt=""
        className="bg-muted size-12 shrink-0 rounded-md border object-cover"
        loading="lazy"
        referrerPolicy="no-referrer"
        src={creative.thumbnail_url}
      />
    );
  return (
    <span className="bg-muted text-muted-foreground flex size-12 shrink-0 items-center justify-center rounded-md border">
      <Megaphone aria-hidden className="size-5" />
    </span>
  );
}

function errorMessage(error: unknown, fallback: string) {
  if (!(error instanceof ApiError)) return fallback;
  return error.fieldErrors.file ?? error.message;
}

function ThumbnailControls({
  creative,
  idPrefix,
  itemId,
  name,
  scope,
}: {
  creative: ListedCreative;
  idPrefix: string;
  itemId: number;
  name: string;
  scope: ReportScope;
}) {
  const upload = useUploadCreativeThumbnail(scope);
  const remove = useRemoveCreativeThumbnail(scope);
  const inputRef = useRef<HTMLInputElement>(null);
  const [problem, setProblem] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const descriptionId = `${idPrefix}-image-description`;

  function send(file: File) {
    const fileProblem = creativeThumbnailProblem(file);
    setProblem(fileProblem ?? "");
    if (fileProblem) return;
    upload.mutate(
      { itemId, creativeKey: creative.key, file },
      {
        onSuccess: () =>
          toast({ title: `Image uploaded for ${name}`, tone: "success" }),
        onError: (error) =>
          setProblem(
            errorMessage(error, "The image could not be uploaded. Try again."),
          ),
      },
    );
  }

  function restore() {
    remove.mutate(
      { itemId, creativeKey: creative.key },
      {
        onSuccess: () => {
          setProblem("");
          toast({
            title: `${name} shows the channel image again`,
            tone: "success",
          });
        },
        onError: (error) =>
          setProblem(
            errorMessage(error, "The image could not be removed. Try again."),
          ),
        onSettled: () => setIsConfirming(false),
      },
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="text-strong text-sm font-medium">Image</p>
      <div className="flex flex-wrap gap-2">
        <Button
          aria-describedby={descriptionId}
          disabled={upload.isPending}
          onClick={() => inputRef.current?.click()}
          size="sm"
          type="button"
          variant="outline"
        >
          <ImagePlus aria-hidden className="size-4" />
          {upload.isPending
            ? "Uploading..."
            : creative.has_custom_thumbnail
              ? "Replace image"
              : "Upload image"}
        </Button>
        {creative.has_custom_thumbnail && (
          <Button
            disabled={remove.isPending || upload.isPending}
            onClick={() => setIsConfirming(true)}
            size="sm"
            type="button"
            variant="ghost"
          >
            <Undo2 aria-hidden className="size-4" />
            Use channel image
          </Button>
        )}
      </div>
      <input
        accept={creativeThumbnailTypes.join(",")}
        aria-label={`Image for ${name}`}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) send(file);
        }}
        ref={inputRef}
        tabIndex={-1}
        type="file"
      />
      {problem ? (
        <p className="text-destructive text-xs font-medium" role="alert">
          {problem}
        </p>
      ) : (
        <p className="text-muted-foreground text-xs" id={descriptionId}>
          JPEG, PNG or WebP up to 5 MB. Uploads straight away, without Save.
        </p>
      )}
      <ConfirmationDialog
        body={
          <p>
            The image uploaded for {name} is deleted, and the image from the
            channel shows again.
          </p>
        }
        confirmLabel="Use channel image"
        description="This can't be undone."
        isOpen={isConfirming}
        isPending={remove.isPending}
        onCancel={() => setIsConfirming(false)}
        onConfirm={restore}
        title="Remove the uploaded image?"
      />
    </div>
  );
}

function CreativeRow({
  creative,
  form,
  index,
  isOpen,
  itemId,
  onToggle,
  scope,
}: {
  creative: ListedCreative;
  form: Form;
  index: number;
  isOpen: boolean;
  itemId: number;
  onToggle: () => void;
  scope: ReportScope;
}) {
  const [hidden, pinned, titles] = useWatch({
    control: form.control,
    name: ["hidden_keys", "pinned_keys", "creative_titles"],
  });
  const key = creative.key;
  const idPrefix = `inspector-creative-${index}`;
  const panelId = `${idPrefix}-panel`;
  const draftTitle = titles[key] ?? "";
  const name = draftTitle.trim() || creative.original_title;
  const isHidden = hidden.includes(key);
  const isPinned = pinned.includes(key);
  const canPin = !isHidden && (isPinned || pinned.length < creativeMaxPins);

  function setTitle(value: string) {
    const next = { ...titles };
    // A creative that had no stored name and is cleared again leaves the
    // form as it was, so it isn't counted as an unsaved change.
    const storedTitles = form.formState.defaultValues?.creative_titles ?? {};
    if (value === "" && !(key in storedTitles)) delete next[key];
    else next[key] = value;
    form.setValue("creative_titles", next, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  function setHidden(isChecked: boolean) {
    form.setValue(
      "hidden_keys",
      isChecked ? [...hidden, key] : hidden.filter((entry) => entry !== key),
      { shouldDirty: true, shouldValidate: true },
    );
    // A hidden creative can't stay pinned.
    if (isChecked && isPinned)
      form.setValue(
        "pinned_keys",
        pinned.filter((entry) => entry !== key),
        { shouldDirty: true, shouldValidate: true },
      );
  }

  function setPinned(isChecked: boolean) {
    form.setValue(
      "pinned_keys",
      isChecked ? [...pinned, key] : pinned.filter((entry) => entry !== key),
      { shouldDirty: true, shouldValidate: true },
    );
  }

  const details = [creative.campaign, creative.format]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="rounded-md border">
      <div className="flex items-center gap-3 p-2">
        <SmallThumbnail creative={creative} />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-strong truncate text-sm font-medium">{name}</p>
          {details && (
            <p className="text-muted-foreground truncate text-xs">{details}</p>
          )}
          {(isHidden ||
            isPinned ||
            draftTitle.trim() ||
            creative.has_custom_thumbnail) && (
            <div className="flex flex-wrap gap-1">
              {isHidden && <Badge tone="warning">Hidden</Badge>}
              {isPinned && (
                <Badge tone="primary">Pinned {pinned.indexOf(key) + 1}</Badge>
              )}
              {draftTitle.trim() && <Badge>Renamed</Badge>}
              {creative.has_custom_thumbnail && <Badge>Own image</Badge>}
            </div>
          )}
        </div>
        <Button
          aria-controls={panelId}
          aria-expanded={isOpen}
          aria-label={`Edit ${name}`}
          onClick={onToggle}
          size="sm"
          type="button"
          variant="ghost"
        >
          <Pencil aria-hidden className="size-4" />
          Edit
        </Button>
      </div>
      {isOpen && (
        <div className="space-y-3 border-t p-3" id={panelId}>
          <FormField
            description={`Leave empty to use “${creative.original_title}”.`}
            id={`${idPrefix}-title`}
            label="Name in the report"
          >
            <Input
              aria-describedby={`${idPrefix}-title-description`}
              autoComplete="off"
              id={`${idPrefix}-title`}
              maxLength={creativeTitleMaxLength}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={creative.original_title}
              value={draftTitle}
            />
          </FormField>
          <div className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={isHidden}
              id={`${idPrefix}-hidden`}
              onChange={(event) => setHidden(event.target.checked)}
            />
            <label htmlFor={`${idPrefix}-hidden`}>Hide from this widget</label>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <Checkbox
                aria-describedby={`${idPrefix}-pinned-description`}
                checked={isPinned}
                disabled={!canPin}
                id={`${idPrefix}-pinned`}
                onChange={(event) => setPinned(event.target.checked)}
              />
              <label htmlFor={`${idPrefix}-pinned`}>Pin to the front</label>
            </div>
            <p
              className="text-muted-foreground pl-7 text-xs"
              id={`${idPrefix}-pinned-description`}
            >
              {isHidden
                ? "A hidden creative can't be pinned."
                : !canPin
                  ? `Up to ${creativeMaxPins} creatives can be pinned.`
                  : "Shown first, whatever the ranking."}
            </p>
          </div>
          <ThumbnailControls
            creative={creative}
            idPrefix={idPrefix}
            itemId={itemId}
            name={name}
            scope={scope}
          />
        </div>
      )}
    </li>
  );
}

// Names for pinned creatives from every list page loaded so far; a pin
// whose creative hasn't been listed yet shows its key.
function useKnownCreativeNames(scope: ReportScope, itemId: number) {
  const client = useQueryClient();
  const names = new Map<string, string>();
  for (const [, list] of client.getQueriesData<CreativeList>({
    queryKey: reportKeys.creatives(scope, itemId),
  }))
    for (const creative of list?.data ?? [])
      names.set(creative.key, creative.original_title);
  return names;
}

function PinnedOrder({
  form,
  knownNames,
}: {
  form: Form;
  knownNames: ReadonlyMap<string, string>;
}) {
  const [pinned, titles, limit] = useWatch({
    control: form.control,
    name: ["pinned_keys", "creative_titles", "limit"],
  });
  if (pinned.length === 0) return null;
  const shownCount = limit ? Number(limit) : defaultLimit;
  const update = (next: string[]) =>
    form.setValue("pinned_keys", next, {
      shouldDirty: true,
      shouldValidate: true,
    });
  return (
    <fieldset className="space-y-2">
      <legend className="text-strong text-sm font-medium">Pinned order</legend>
      <p className="text-muted-foreground text-xs">
        Pinned creatives come first, in this order, and count toward Creatives
        shown.
        {pinned.length > shownCount &&
          ` Only the first ${shownCount} appear on the card.`}
      </p>
      <ol className="space-y-1">
        {pinned.map((key, index) => {
          const name = titles[key]?.trim() || knownNames.get(key) || key;
          return (
            <li
              className="flex items-center justify-between gap-2 rounded-md border py-1 pr-1 pl-3 text-sm"
              key={key}
            >
              <span className="min-w-0 truncate">
                {index + 1}. {name}
              </span>
              <ListControls
                count={pinned.length}
                index={index}
                label={`pin for ${name}`}
                move={(from, to) => {
                  const next = [...pinned];
                  next.splice(to, 0, ...next.splice(from, 1));
                  update(next);
                }}
                remove={(at) =>
                  update(pinned.filter((_, position) => position !== at))
                }
              />
            </li>
          );
        })}
      </ol>
    </fieldset>
  );
}

function CreativeManager({
  form,
  item,
  range,
  scope,
}: {
  form: Form;
  item: LayoutItem;
  range: PreviewRange;
  scope: ReportScope;
}) {
  const searchId = useId();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const [page, setPage] = useState(1);
  const [openKey, setOpenKey] = useState<string>();
  const creatives = useCreatives(scope, item.id, {
    ...range,
    search: deferredSearch || undefined,
    page,
    per_page: creativesPerPage,
  });
  const errors = form.formState.errors;
  // Name errors arrive for the whole list, not per creative key.
  const titlesError = errors.creative_titles as FieldError | undefined;
  const listError =
    titlesError?.message ??
    errors.hidden_keys?.message ??
    errors.pinned_keys?.message;
  const meta = creatives.data?.meta;
  // Read here, as this list re-renders when a page arrives.
  const knownNames = useKnownCreativeNames(scope, item.id);

  let body;
  if (creatives.isPending)
    body = (
      <p className="text-muted-foreground text-sm">Loading creatives...</p>
    );
  else if (creatives.isError)
    body = (
      <div className="space-y-2">
        <p className="text-destructive text-sm" role="alert">
          The creatives could not be loaded.
        </p>
        <Button
          onClick={() => creatives.refetch()}
          size="sm"
          type="button"
          variant="outline"
        >
          Try again
        </Button>
      </div>
    );
  else if (creatives.data.data.length === 0)
    body = (
      <p className="text-muted-foreground text-sm">
        {deferredSearch
          ? `No creatives match “${deferredSearch}”.`
          : "No creatives have data in this date range."}
      </p>
    );
  else
    body = (
      <ul aria-busy={creatives.isFetching} className="space-y-2">
        {creatives.data.data.map((creative, index) => (
          <CreativeRow
            creative={creative}
            form={form}
            index={index}
            isOpen={openKey === creative.key}
            itemId={item.id}
            key={creative.key}
            onToggle={() =>
              setOpenKey((current) =>
                current === creative.key ? undefined : creative.key,
              )
            }
            scope={scope}
          />
        ))}
      </ul>
    );

  return (
    <fieldset className="space-y-2">
      <legend className="text-strong text-sm font-medium">Creatives</legend>
      <p className="text-muted-foreground text-xs">
        Rename, hide or pin a creative, or give it your own image. Names, hiding
        and pins apply when you save. Numbers come from the channel data and
        can&apos;t be edited yet.
      </p>
      {listError && (
        <p className="text-destructive text-xs font-medium" role="alert">
          {listError}
        </p>
      )}
      <div className="relative">
        <label className="sr-only" htmlFor={searchId}>
          Search creatives
        </label>
        <Search
          aria-hidden
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
        />
        <Input
          autoComplete="off"
          className="pl-9"
          id={searchId}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          // Enter searches rather than submitting the widget form.
          onKeyDown={(event) => {
            if (event.key === "Enter") event.preventDefault();
          }}
          placeholder="Search by name or campaign"
          type="search"
          value={search}
        />
      </div>
      {body}
      {meta && meta.last_page > 1 && (
        <nav
          aria-label="Creative pages"
          className="flex items-center justify-between gap-2"
        >
          <Button
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
            size="sm"
            type="button"
            variant="outline"
          >
            Previous
          </Button>
          <span className="text-muted-foreground text-xs">
            Page {meta.current_page} of {meta.last_page}
          </span>
          <Button
            disabled={page >= meta.last_page}
            onClick={() => setPage((current) => current + 1)}
            size="sm"
            type="button"
            variant="outline"
          >
            Next
          </Button>
        </nav>
      )}
      <PinnedOrder form={form} knownNames={knownNames} />
    </fieldset>
  );
}

export function CreativeSettings({
  form,
  item,
  range,
  scope,
}: {
  form: Form;
  item: LayoutItem;
  range: PreviewRange;
  scope: ReportScope;
}) {
  return (
    <>
      <FormField id="inspector-sort" label="Rank creatives by">
        <Select id="inspector-sort" {...form.register("sort_metric")}>
          <option value="">Default (Conversions)</option>
          {reportMetricCodes.map((code) => (
            <option key={code} value={code}>
              {reportMetricLabel(code)}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField
        description="Best first puts the highest value first, or the lowest for CPA and CPC."
        id="inspector-sort-direction"
        label="Order"
      >
        <Select
          aria-describedby="inspector-sort-direction-description"
          id="inspector-sort-direction"
          {...form.register("sort_direction")}
        >
          <option value="">Best first (default)</option>
          <option value="desc">Highest first</option>
          <option value="asc">Lowest first</option>
        </Select>
      </FormField>
      <FormField id="inspector-limit" label="Creatives shown">
        <Select id="inspector-limit" {...form.register("limit")}>
          <option value="">Default ({defaultLimit})</option>
          {Array.from(
            { length: creativeMaxLimit },
            (_, index) => index + 1,
          ).map((count) => (
            <option key={count} value={count}>
              {count}
            </option>
          ))}
        </Select>
      </FormField>
      <CardMetrics form={form} />
      <CreativeManager form={form} item={item} range={range} scope={scope} />
    </>
  );
}
