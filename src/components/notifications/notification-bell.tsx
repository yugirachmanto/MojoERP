"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useI18n } from "@/lib/i18n/provider";
import { timeAgo } from "@/lib/utils";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/server/actions/notifications";
import type { Tables } from "@/types/database";

type Notification = Tables<"notifications">;

export function NotificationBell({
  orgId,
  initial,
  userId,
}: {
  orgId: string;
  initial: Notification[];
  userId: string;
}) {
  const [notifications, setNotifications] = useState<Notification[]>(initial);
  const { t } = useI18n();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notif:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const unread = notifications.filter((n) => !n.read_at).length;

  async function handleRead(id: string) {
    await markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    );
  }

  async function handleReadAll() {
    await markAllNotificationsRead(orgId);
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" className="relative" />}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <Badge className="absolute -right-1 -top-1 h-4 min-w-4 px-1 text-[10px]">
            {unread > 9 ? "9+" : unread}
          </Badge>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>{t("notifications.title")}</span>
            {unread > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 gap-1 text-xs"
                onClick={handleReadAll}
              >
                <CheckCheck className="h-3 w-3" />
                {t("notifications.markAllRead")}
              </Button>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <ScrollArea className="h-72">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {t("notifications.empty")}
            </div>
          ) : (
            notifications.slice(0, 30).map((n) => (
              <button
                key={n.id}
                onClick={() => handleRead(n.id)}
                className="block w-full border-b px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <p
                    className={`text-sm ${n.read_at ? "text-muted-foreground" : "font-medium text-foreground"}`}
                  >
                    {n.title}
                  </p>
                  {!n.read_at && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                </div>
                {n.body && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {n.body}
                  </p>
                )}
                <p className="mt-1 text-[11px] text-muted-foreground/70">
                  {timeAgo(n.created_at)}
                </p>
              </button>
            ))
          )}
        </ScrollArea>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}