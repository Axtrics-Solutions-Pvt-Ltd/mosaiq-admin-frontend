import {
  AlertTriangle,
  FileSearch,
  FolderOpen,
  LockKeyhole,
  type LucideIcon,
  RefreshCw,
} from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
type Kind = "empty" | "no-results" | "error" | "permission" | "unavailable";
const icons: Record<Kind, LucideIcon> = {
  empty: FolderOpen,
  "no-results": FileSearch,
  error: AlertTriangle,
  permission: LockKeyhole,
  unavailable: RefreshCw,
};
export function StatePanel({
  action,
  description,
  kind,
  title,
}: {
  action?: ReactNode;
  description: string;
  kind: Kind;
  title: string;
}) {
  const Icon = icons[kind];
  return (
    <Card className="flex min-h-56 flex-col items-center justify-center p-6 text-center">
      <span className="bg-muted text-muted-foreground rounded-full p-3">
        <Icon aria-hidden className="size-6" />
      </span>
      <h2 className="text-strong mt-4 text-base font-semibold">{title}</h2>
      <p className="text-muted-foreground mt-1 max-w-md text-sm">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </Card>
  );
}
export function ErrorState() {
  return (
    <StatePanel
      action={<Button variant="outline">Try again</Button>}
      description="The preview could not load this content. Try the request again."
      kind="error"
      title="Something went wrong"
    />
  );
}
