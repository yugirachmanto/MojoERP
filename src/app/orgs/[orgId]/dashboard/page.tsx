import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarClock,
  CircleDashed,
  FolderKanban,
  TriangleAlert,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { createClient } from "@/lib/supabase/server";
import { requireOrg } from "@/lib/auth";
import { PRIORITY_STYLES } from "@/lib/constants";
import { formatDate, isOverdue } from "@/lib/utils";
import { getServerLanguage } from "@/lib/i18n/server";
import { translate } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const membership = await requireOrg(orgId);
  const supabase = await createClient();
  const lang = await getServerLanguage();
  const t = (key: Parameters<typeof translate>[1], vars?: Record<string, string | number>) =>
    translate(lang, key, vars);

  const { data: myMembership } = await supabase
    .from("organization_members")
    .select("invited_by")
    .eq("organization_id", orgId)
    .eq("user_id", membership.user_id)
    .maybeSingle();

  let inviterName: string | null = null;
  if (myMembership?.invited_by) {
    const { data: inviterProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", myMembership.invited_by)
      .maybeSingle();
    inviterName = inviterProfile?.full_name ?? null;
  }

  const today = new Date();
  const in7Days = new Date(today.getTime() + 7 * 86400000).toISOString();

  const { data: myTasks } = await supabase
    .from("tasks")
    .select("*, projects(id, name, organization_id)")
    .eq("assignee_id", membership.user_id)
    .eq("projects.organization_id", orgId)
    .neq("status", "done")
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(20);

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, status, start_date, end_date, organization_id")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(10);

  const { count: totalTasks } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .in(
      "project_id",
      (projects ?? []).map((p) => p.id)
    );

  const { count: doneTasks } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("status", "done")
    .in(
      "project_id",
      (projects ?? []).map((p) => p.id)
    );

  const myTasksList = (myTasks ?? []).map((t) => ({
    ...t,
    project: t.projects as unknown as { id: string; name: string },
  }));

  const upcoming = myTasksList.filter(
    (t) => t.due_date && new Date(t.due_date) <= new Date(in7Days)
  );
  const overdue = myTasksList.filter((t) => t.due_date && isOverdue(t.due_date));

  const progressPct =
    (projects ?? []).length > 0 && (totalTasks ?? 0) > 0
      ? Math.round(((doneTasks ?? 0) / (totalTasks ?? 0)) * 100)
      : 0;

  const projectIds = (projects ?? []).map((p) => p.id);
  const { data: orgTasks } = projectIds.length > 0
    ? await supabase.from("tasks").select("id").in("project_id", projectIds)
    : { data: [] };
  const taskIds = (orgTasks ?? []).map((t) => t.id);

  const { data: recentActivity } = taskIds.length > 0
    ? await supabase
        .from("task_activity_log")
        .select("*, tasks(id, title, project_id, projects(name)), profiles(full_name)")
        .in("task_id", taskIds)
        .order("created_at", { ascending: false })
        .limit(8)
    : { data: [] };

  const activityList = (recentActivity ?? []).map((a) => ({
    ...a,
    task: a.tasks as unknown as { id: string; title: string; project_id: string; projects: { name: string } } | null,
    profile: a.profiles as unknown as { full_name: string | null } | null,
  }));

  return (
    <div className="space-y-6 pb-12">
      {/* Bento Header Hero */}
      <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/10 via-background to-muted/40 p-8 shadow-sm">
        <div className="absolute right-6 top-6 hidden md:block opacity-20">
          <Sparkles className="h-32 w-32 text-primary" />
        </div>
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Workspace Dashboard
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("dashboard.hello", { name: membership.organizations?.name ?? "" })}
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            {t("dashboard.subtitle")}
          </p>
        </div>
      </div>

      {inviterName && (
        <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4 text-sm text-primary flex items-center justify-between shadow-xs">
          <span>🎉 Selamat datang! Anda bergabung ke organisasi ini atas undangan dari <strong>{inviterName}</strong>.</span>
        </div>
      )}

      {/* Bento Grid Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="group rounded-2xl border bg-card p-5 shadow-xs transition-all hover:shadow-md hover:scale-[1.01]">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("dashboard.myTasks")}
            </span>
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <CircleDashed className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold tracking-tight">{myTasksList.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("dashboard.notFinished")}</p>
        </div>

        <div className="group rounded-2xl border bg-card p-5 shadow-xs transition-all hover:shadow-md hover:scale-[1.01]">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("dashboard.dueSoon")}
            </span>
            <div className="rounded-xl bg-amber-500/10 p-2 text-amber-600">
              <CalendarClock className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold tracking-tight">{upcoming.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("dashboard.deadlineNear")}</p>
        </div>

        <div className="group rounded-2xl border bg-card p-5 shadow-xs transition-all hover:shadow-md hover:scale-[1.01]">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("dashboard.overdue")}
            </span>
            <div className="rounded-xl bg-destructive/10 p-2 text-destructive">
              <TriangleAlert className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold tracking-tight text-destructive">{overdue.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("dashboard.needsAttention")}</p>
        </div>

        <div className="group rounded-2xl border bg-card p-5 shadow-xs transition-all hover:shadow-md hover:scale-[1.01]">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("dashboard.activeProjects")}
            </span>
            <div className="rounded-xl bg-blue-500/10 p-2 text-blue-600">
              <FolderKanban className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold tracking-tight">
            {(projects ?? []).filter((p) => p.status === "active").length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("dashboard.ofProjects", { count: (projects ?? []).length })}
          </p>
        </div>
      </div>

      {/* Bento Grid Main Content Cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* My Tasks Bento Tile */}
        <div className="rounded-3xl border bg-card p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-tight">{t("dashboard.myTasks")}</h2>
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                {myTasksList.length} items
              </span>
            </div>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {myTasksList.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  {t("dashboard.noTasksAssigned")}
                </div>
              ) : (
                myTasksList.map((task) => (
                  <Link
                    key={task.id}
                    href={`/orgs/${orgId}/projects/${task.project_id}/tasks/${task.id}`}
                    className="group block rounded-2xl border bg-background/50 p-4 transition-all hover:bg-muted/50 hover:shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold group-hover:text-primary transition-colors">{task.title}</p>
                      <Badge className={PRIORITY_STYLES[task.priority]}>
                        {task.priority}
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-medium text-foreground/80">{task.project.name}</span>
                      <span className={isOverdue(task.due_date) ? "font-semibold text-destructive" : ""}>
                        {task.due_date ? formatDate(task.due_date) : t("dashboard.noDeadline")}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent Projects Bento Tile */}
        <div className="rounded-3xl border bg-card p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-tight">{t("dashboard.recentProjects")}</h2>
              <Link href={`/orgs/${orgId}/projects`} className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
                Lihat semua <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {(projects ?? []).length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                {t("dashboard.noProjectsBody")}{" "}
                <Link href={`/orgs/${orgId}/projects`} className="text-primary hover:underline font-medium">
                  {t("dashboard.createFirstProject")}
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
                    <span>{t("dashboard.overallProgress")}</span>
                    <span className="font-bold text-foreground">{progressPct}%</span>
                  </div>
                  <Progress value={progressPct} className="h-2" />
                </div>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {(projects ?? []).map((p) => (
                    <Link
                      key={p.id}
                      href={`/orgs/${orgId}/projects/${p.id}`}
                      className="group flex items-center justify-between gap-3 rounded-2xl border bg-background/50 p-4 transition-all hover:bg-muted/50 hover:shadow-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold group-hover:text-primary transition-colors">{p.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(p.start_date)} — {formatDate(p.end_date)}
                        </p>
                      </div>
                      <Badge variant="secondary" className="capitalize">
                        {p.status.replace("_", " ")}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity Bento Tile (Full Width) */}
      <div className="rounded-3xl border bg-card p-6 shadow-xs">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight">Aktivitas Terbaru (Recent Activity)</h2>
        </div>
        {activityList.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Belum ada aktivitas terbaru.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {activityList.map((act) => (
              <div key={act.id} className="flex items-start justify-between gap-3 rounded-2xl border bg-background/50 p-4 transition-all hover:bg-muted/40">
                <div className="space-y-1 min-w-0">
                  <p className="text-sm font-medium leading-snug">
                    <span className="font-bold text-foreground">{act.profile?.full_name ?? "Seseorang"}</span>{" "}
                    <span className="text-muted-foreground">
                      {act.action === "created" ? "membuat task" : `memperbarui ${act.field ?? "task"}`}
                    </span>{" "}
                    <span className="font-semibold text-primary">{act.task?.title ?? "Task"}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Project: <span className="font-medium text-foreground">{act.task?.projects?.name ?? "—"}</span> • {formatDate(act.created_at)}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0 uppercase tracking-wide">
                  {act.action}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}