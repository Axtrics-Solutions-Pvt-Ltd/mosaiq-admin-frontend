import {
  Clapperboard,
  GalleryHorizontal,
  Image as ImageIcon,
  type LucideIcon,
  Megaphone,
} from "lucide-react";

import { formatValue } from "@/lib/formatters";

import type { WidgetPayload } from "./contracts";

type Creative = WidgetPayload<"creative_grid">["items"][number];

const formatPlaceholders: Record<string, { icon: LucideIcon; label: string }> =
  {
    video: { icon: Clapperboard, label: "Video" },
    image: { icon: ImageIcon, label: "Image" },
    carousel: { icon: GalleryHorizontal, label: "Carousel" },
  };
const fallbackPlaceholder = { icon: Megaphone, label: "Creative" };

// Metric codes arrive as keys; well-known acronyms keep their capitals.
const acronyms = new Set(["ctr", "cpa", "cpm", "cpc", "roas"]);
function metricName(code: string) {
  if (acronyms.has(code)) return code.toUpperCase();
  const words = code.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function Thumbnail({ creative }: { creative: Creative }) {
  const placeholder =
    (creative.format && formatPlaceholders[creative.format]) ||
    fallbackPlaceholder;
  if (creative.thumbnail_url)
    return (
      // Thumbnails are hosted by the ad platforms on hosts this app can't
      // list in advance, so the Next.js image optimiser can't serve them.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt=""
        className="bg-muted aspect-video w-full rounded-md border object-cover"
        loading="lazy"
        referrerPolicy="no-referrer"
        src={creative.thumbnail_url}
      />
    );
  const Icon = placeholder.icon;
  return (
    <div className="bg-muted text-muted-foreground flex aspect-video w-full flex-col items-center justify-center gap-1 rounded-md border">
      <Icon aria-hidden className="size-6" />
      <span className="text-xs font-medium">{placeholder.label}</span>
    </div>
  );
}

export function CreativeGridWidget({
  currency,
  payload,
}: {
  currency: string;
  payload: WidgetPayload<"creative_grid">;
}) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {payload.items.map((creative) => (
        <li
          className="flex flex-col gap-3 rounded-lg border p-3"
          key={creative.key}
        >
          <Thumbnail creative={creative} />
          <div className="min-w-0">
            <p className="text-strong font-medium break-words">
              {creative.title}
            </p>
            <p className="text-muted-foreground text-xs">
              {[
                creative.format &&
                  (formatPlaceholders[creative.format]?.label ??
                    creative.format),
                creative.campaign,
              ]
                .filter(Boolean)
                .join(" · ") || "—"}
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            {Object.entries(creative.metrics).map(([code, metric]) => (
              <div key={code}>
                <dt className="text-muted-foreground text-xs">
                  {metricName(code)}
                </dt>
                <dd className="text-strong font-semibold tabular-nums">
                  {formatValue(metric.value, metric.format, currency)}
                </dd>
              </div>
            ))}
          </dl>
        </li>
      ))}
    </ul>
  );
}
