import { ChartLine, type LucideIcon, Megaphone, Plug } from "lucide-react";

import { Badge } from "@/components/ui/Badge";

const categoryIcons: Record<string, LucideIcon | undefined> = {
  ads: Megaphone,
  analytics: ChartLine,
};

export function ChannelBadge({
  channel,
}: {
  channel: { name: string; category: string } | null;
}) {
  if (!channel) return <Badge tone="neutral">No channel</Badge>;
  const Icon = categoryIcons[channel.category] ?? Plug;
  return (
    <Badge tone="primary">
      <Icon aria-hidden className="size-3" />
      {channel.name}
    </Badge>
  );
}
