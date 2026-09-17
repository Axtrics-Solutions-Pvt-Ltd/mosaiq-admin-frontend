"use client";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  Menu,
  Search,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";

import { BrandMark } from "@/components/layout/BrandMark";
import { SidebarNavigation } from "@/components/layout/SidebarNavigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { Select } from "@/components/ui/Select";
import { getNavigationItem } from "@/config/navigation";
import { routes } from "@/config/routes";
import { useCurrentUser, useLogout } from "@/features/auth/queries";
import { ApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils/cn";
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentUser = useCurrentUser();
  const logoutMutation = useLogout();
  const [logoutError, setLogoutError] = useState<string>();
  const didHandleSessionLoss = useRef(false);
  useEffect(() => {
    if (
      didHandleSessionLoss.current ||
      !(currentUser.error instanceof ApiError)
    )
      return;
    if (
      currentUser.error.status === 401 &&
      currentUser.error.errorCode === "UNAUTHENTICATED"
    ) {
      didHandleSessionLoss.current = true;
      queryClient.clear();
      router.replace(routes.sessionExpired);
    } else if (currentUser.error.status === 403) {
      didHandleSessionLoss.current = true;
      router.replace(routes.forbidden);
    }
  }, [currentUser.error, queryClient, router]);
  async function handleLogout() {
    setLogoutError(undefined);
    didHandleSessionLoss.current = true;
    try {
      await logoutMutation.mutateAsync();
      router.replace(routes.signedOut);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        queryClient.clear();
        router.replace(routes.sessionExpired);
        return;
      }
      didHandleSessionLoss.current = false;
      setLogoutError(
        error instanceof ApiError
          ? error.message
          : "Sign out failed. Please try again.",
      );
    }
  }
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const previousPath = useRef(pathname);
  useEffect(() => {
    if (previousPath.current !== pathname) {
      document.getElementById("main-content")?.focus();
      previousPath.current = pathname;
    }
  }, [pathname]);
  const current = getNavigationItem(pathname);
  return (
    <div
      className="min-h-screen lg:grid"
      style={{
        gridTemplateColumns: collapsed
          ? "var(--sidebar-collapsed-width) minmax(0,1fr)"
          : "var(--sidebar-width) minmax(0,1fr)",
      }}
    >
      <a
        className="bg-primary fixed top-2 left-1/2 z-[100] -translate-x-1/2 -translate-y-20 rounded-sm px-4 py-2 font-medium text-white focus:translate-y-0"
        href="#main-content"
      >
        Skip to main content
      </a>
      <aside className="bg-card sticky top-0 hidden h-dvh flex-col border-r lg:flex">
        <div
          className={cn(
            "flex h-16 items-center border-b px-4",
            collapsed && "justify-center px-2",
          )}
        >
          <BrandMark compact={collapsed} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <SidebarNavigation collapsed={collapsed} />
        </div>
        <div className="border-t p-3">
          <Button
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn("w-full", collapsed && "px-0")}
            onClick={() => setCollapsed((value) => !value)}
            variant="ghost"
          >
            {collapsed ? (
              <ChevronsRight className="size-4" />
            ) : (
              <>
                <ChevronsLeft className="size-4" />
                Collapse sidebar
              </>
            )}
          </Button>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="bg-card/95 sticky top-0 z-30 flex min-h-16 items-center gap-2 border-b px-[var(--page-padding)] backdrop-blur">
          <Button
            aria-label="Open navigation"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            size="icon"
            variant="ghost"
          >
            <Menu className="size-5" />
          </Button>
          <div className="hidden min-w-0 sm:block">
            <p className="text-strong truncate text-sm font-medium">
              {current?.label ?? "Design system"}
            </p>
            <p className="text-muted-foreground text-xs">
              Admin / {current?.label ?? "Preview"}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge className="inline-flex" tone="primary">
              Demo data
            </Badge>
            <div className="hidden w-40 lg:block">
              <Select aria-label="Agency scope" defaultValue="all">
                <option value="all">All agencies</option>
                <option value="northstar">Northstar Digital</option>
                <option value="kinetic">Kinetic Growth</option>
                <option value="atlas">Atlas Partners</option>
              </Select>
            </div>
            <div className="hidden w-40 2xl:block">
              <Select aria-label="Workspace scope" defaultValue="all">
                <option value="all">All workspaces</option>
                <option value="commerce">Commerce Hub</option>
                <option value="insights">Insights Lab</option>
              </Select>
            </div>
            <Button
              aria-label="Search (UI preview)"
              disabled
              size="icon"
              title="Search preview"
              variant="ghost"
            >
              <Search className="size-4" />
            </Button>
            <Button
              aria-label="Notifications, 3 unread (UI preview)"
              disabled
              className="relative"
              size="icon"
              variant="ghost"
            >
              <Bell className="size-4" />
              <span className="bg-destructive absolute top-1.5 right-1.5 size-2 rounded-full">
                <span className="sr-only">3 unread</span>
              </span>
            </Button>
            <details className="relative">
              <summary
                aria-label="Open profile menu"
                className="bg-primary-soft text-primary flex size-10 list-none items-center justify-center rounded-full font-semibold [&::-webkit-details-marker]:hidden"
              >
                {currentUser.data?.name
                  .split(" ")
                  .map((part) => part[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase() ?? "?"}
              </summary>
              <div className="bg-card absolute right-0 mt-2 w-56 rounded-lg border p-2 shadow-[var(--shadow-overlay)]">
                <div className="border-b px-3 py-2">
                  <p className="text-strong font-medium">
                    {currentUser.data?.name ?? "Account"}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {currentUser.data?.email ?? ""}
                  </p>
                </div>
                <Link
                  className="hover:bg-muted mt-1 flex items-center gap-2 rounded-sm px-3 py-2"
                  href={routes.designSystem}
                >
                  <UserRound className="size-4" />
                  Component preview
                </Link>
                <button
                  className="hover:bg-muted mt-1 flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left disabled:opacity-50"
                  disabled={logoutMutation.isPending}
                  onClick={handleLogout}
                  type="button"
                >
                  <LogOut aria-hidden className="size-4" />
                  {logoutMutation.isPending ? "Signing out..." : "Sign out"}
                </button>
                {logoutError && (
                  <p
                    className="text-destructive px-3 py-2 text-xs"
                    role="alert"
                  >
                    {logoutError}
                  </p>
                )}
              </div>
            </details>
          </div>
        </header>
        <main
          className="min-h-[calc(100vh-4rem)] p-[var(--page-padding)]"
          id="main-content"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
      <Drawer
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        side="left"
        title="MOSAIQ Admin"
      >
        <div className="mb-4">
          <Badge tone="primary">Demo data</Badge>
        </div>
        <SidebarNavigation onNavigate={() => setMobileOpen(false)} />
        <div className="mt-6 space-y-3 border-t pt-4">
          <label
            className="text-muted-foreground block text-xs font-medium"
            htmlFor="mobile-agency"
          >
            Agency scope
          </label>
          <Select defaultValue="all" id="mobile-agency">
            <option value="all">All agencies</option>
            <option value="northstar">Northstar Digital</option>
            <option value="kinetic">Kinetic Growth</option>
          </Select>
        </div>
      </Drawer>
    </div>
  );
}
