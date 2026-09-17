"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { navigationGroups } from "@/config/navigation";
import { cn } from "@/lib/utils/cn";
export function SidebarNavigation({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="space-y-5">
      {navigationGroups.map((group) => (
        <div key={group.label}>
          {!collapsed && (
            <p className="text-muted-foreground mb-1.5 px-3 text-[.6875rem] font-semibold tracking-wide uppercase">
              {group.label}
            </p>
          )}
          <ul className="space-y-1">
            {group.items.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    aria-current={isActive ? "page" : undefined}
                    aria-label={collapsed ? item.label : undefined}
                    className={cn(
                      "text-foreground hover:bg-muted hover:text-strong flex min-h-10 items-center gap-3 rounded-sm px-3 font-medium transition-colors",
                      isActive && "bg-primary-soft text-primary",
                      collapsed && "justify-center px-0",
                    )}
                    href={item.href}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon aria-hidden className="size-[1.125rem] shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
