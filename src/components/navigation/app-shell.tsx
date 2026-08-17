"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FolderKanban,
  LayoutDashboard,
  Settings,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { OrgSwitcher } from "@/components/navigation/org-switcher";
import { UserMenu } from "@/components/navigation/user-menu";
import { useI18n } from "@/lib/i18n/provider";
import type { Tables } from "@/types/database";
import type { OrgMembership } from "@/lib/auth";

type Org = Pick<Tables<"organizations">, "id" | "name" | "slug" | "logo_url">;

const NAV_ITEMS = [
  { href: "/dashboard", key: "nav.dashboard", icon: LayoutDashboard },
  { href: "/projects", key: "nav.projects", icon: FolderKanban },
  { href: "/members", key: "nav.members", icon: Users },
  { href: "/settings", key: "nav.settings", icon: Settings },
] as const;

export function AppShell({
  orgId,
  org,
  memberships,
  user,
  notifications,
  children,
}: {
  orgId: string;
  org: Org;
  memberships: OrgMembership[];
  user: { id: string; email?: string; full_name?: string };
  notifications: Tables<"notifications">[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <div className="flex min-h-full">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r bg-muted/30 md:flex">
        <OrgSwitcher orgId={orgId} org={org} memberships={memberships} />
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(`/orgs/${orgId}${item.href}`);
            return (
              <Button
                key={item.href}
                render={<Link href={`/orgs/${orgId}${item.href}`} />}
                variant={active ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-2.5",
                  active && "font-medium"
                )}
              >
                <item.icon className="h-4 w-4" />
                {t(item.key)}
              </Button>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-h-full flex-1 flex-col md:pl-60">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur">
          <div className="flex items-center gap-3 md:hidden">
            <OrgSwitcher orgId={orgId} org={org} memberships={memberships} />
          </div>
          <div className="hidden md:block" />
          <div className="flex items-center gap-1.5">
            <NotificationBell
              orgId={orgId}
              initial={notifications}
              userId={user.id}
            />
            <UserMenu
              user={{
                email: user.email ?? "",
                full_name: user.full_name ?? "User",
              }}
            />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}