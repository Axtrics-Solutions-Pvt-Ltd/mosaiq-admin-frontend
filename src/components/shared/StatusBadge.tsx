import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Info,
  type LucideIcon,
  MinusCircle,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/Badge";
type Status =
  | "active"
  | "inactive"
  | "invited"
  | "pending"
  | "seeded"
  | "imported"
  | "planned"
  | "unavailable"
  | "processing"
  | "completed"
  | "warning"
  | "failed";
const statuses: Record<
  Status,
  {
    icon: LucideIcon;
    label: string;
    tone: "neutral" | "primary" | "success" | "warning" | "danger" | "info";
  }
> = {
  active: { icon: CheckCircle2, label: "Active", tone: "success" },
  inactive: { icon: MinusCircle, label: "Inactive", tone: "neutral" },
  invited: { icon: Info, label: "Invited", tone: "info" },
  pending: { icon: Clock3, label: "Pending", tone: "warning" },
  seeded: { icon: CheckCircle2, label: "Seeded", tone: "primary" },
  imported: { icon: CheckCircle2, label: "Imported", tone: "success" },
  planned: { icon: Clock3, label: "Planned", tone: "neutral" },
  unavailable: { icon: MinusCircle, label: "Unavailable", tone: "neutral" },
  processing: { icon: Clock3, label: "Processing", tone: "info" },
  completed: { icon: CheckCircle2, label: "Completed", tone: "success" },
  warning: { icon: AlertTriangle, label: "Warning", tone: "warning" },
  failed: { icon: XCircle, label: "Failed", tone: "danger" },
};
export function StatusBadge({ status }: { status: Status }) {
  const config = statuses[status];
  const Icon = config.icon;
  return (
    <Badge aria-label={`Status: ${config.label}`} tone={config.tone}>
      <Icon aria-hidden className="size-3" />
      {config.label}
    </Badge>
  );
}
