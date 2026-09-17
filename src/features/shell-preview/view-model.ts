import { Building2, Database, UsersRound, Workflow } from "lucide-react";
export const shellPreview = {
  metrics: [
    {
      change: "+2 this month",
      icon: Building2,
      label: "Active agencies",
      value: "12",
    },
    {
      change: "Across 3 agencies",
      icon: Workflow,
      label: "Workspaces",
      value: "38",
    },
    {
      change: "4 invitations pending",
      icon: UsersRound,
      label: "Admin users",
      value: "24",
    },
    {
      change: "Last import 18 min ago",
      icon: Database,
      label: "Data health",
      value: "96%",
    },
  ],
  activity: [
    {
      agency: "Northstar Digital",
      name: "Quarterly data import",
      status: "completed" as const,
      time: "18 min ago",
    },
    {
      agency: "Kinetic Growth",
      name: "Workspace access review",
      status: "warning" as const,
      time: "2 hours ago",
    },
    {
      agency: "Atlas Partners",
      name: "Connector configuration",
      status: "planned" as const,
      time: "Yesterday",
    },
  ],
};
