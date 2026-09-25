import { Check, Dot, X } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils/cn";

import type { WidgetPayload } from "./contracts";

// Written content is rendered as plain text, never as HTML.

export function TextHeroWidget({
  payload,
}: {
  payload: WidgetPayload<"text_hero">;
}) {
  return (
    <div className="space-y-2">
      {payload.headline && (
        <p className="text-strong text-lg font-semibold">{payload.headline}</p>
      )}
      {payload.body && (
        <p className="text-foreground whitespace-pre-line">{payload.body}</p>
      )}
    </div>
  );
}

const tones = {
  positive: {
    icon: Check,
    className: "bg-success-soft text-success",
    label: "Positive",
  },
  negative: {
    icon: X,
    className: "bg-destructive-soft text-destructive",
    label: "Negative",
  },
  neutral: {
    icon: Dot,
    className: "bg-muted text-muted-foreground",
    label: "Note",
  },
};

export function BulletListWidget({
  payload,
}: {
  payload: WidgetPayload<"bullet_list">;
}) {
  const tone = tones[payload.tone];
  const Icon = tone.icon;
  return (
    <ul className="space-y-2.5">
      {payload.items.map((item, index) => (
        // Written items have no id; their position is their identity.
        <li className="flex gap-2.5" key={index}>
          <span
            className={cn(
              "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
              tone.className,
            )}
          >
            <Icon aria-hidden className="size-3.5" />
            <span className="sr-only">{tone.label}: </span>
          </span>
          <span className="whitespace-pre-line">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function RecommendationListWidget({
  payload,
}: {
  payload: WidgetPayload<"recommendation_list">;
}) {
  return (
    <ol className="grid gap-3 md:grid-cols-2">
      {payload.items.map((item, index) => (
        <li className="bg-muted space-y-2 rounded-lg border p-4" key={index}>
          <p className="text-strong font-semibold">{item.title}</p>
          {item.body && (
            <p className="text-muted-foreground text-sm whitespace-pre-line">
              {item.body}
            </p>
          )}
          {item.owner && <Badge tone="primary">{item.owner}</Badge>}
        </li>
      ))}
    </ol>
  );
}
