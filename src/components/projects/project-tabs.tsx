"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, FileText, GanttChartSquare, ListTodo, Info, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "", key: "nav.overview", icon: Info, exact: true },
  { href: "/board", key: "nav.board", icon: GanttChartSquare, exact: false },
  { href: "/gantt", key: "nav.gantt", icon: CalendarDays, exact: false },
  { href: "/chat", key: "nav.chat", icon: MessageSquare, exact: false },
  { href: "/files", key: "nav.files", icon: FileText, exact: false },
  { href: "/tasks", key: "nav.tasks", icon: ListTodo, exact: false },
] as const;

export function ProjectTabs({
  orgId,
  projectId,
}: {
  orgId: string;
  projectId: string;
}) {
  const pathname = usePathname();
  const { t } = useI18n();
  const base = `/orgs/${orgId}/projects/${projectId}`;

  return (
    <nav className="flex flex-wrap items-center gap-1 border-b pb-px">
      {TABS.map((tab) => {
        const target = tab.exact ? base : `${base}${tab.href}`;
        const active = tab.exact
          ? pathname === base
          : pathname.startsWith(target);
        return (
          <Button
            key={tab.href}
            render={<Link href={target} />}
            variant="ghost"
            className={cn(
              "relative rounded-b-none border-b-2 border-transparent px-3 py-2",
              active && "border-primary text-primary"
            )}
          >
            <tab.icon className="mr-1.5 h-4 w-4" />
            {t(tab.key)}
          </Button>
        );
      })}
    </nav>
  );
}
