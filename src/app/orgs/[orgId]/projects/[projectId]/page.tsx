import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarDays,
  MessageSquare,
  Users,
  FileText,
  GanttChartSquare,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { createClient } from "@/lib/supabase/server";
import { requireOrg } from "@/lib/auth";
import { PROJECT_STATUS_STYLES, TASK_STATUSES, MEMBER_ROLE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Project Overview" };

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ orgId: string; projectId: string }>;
}) {
  const { orgId, projectId } = await params;
  await requireOrg(orgId);
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("organization_id", orgId)
    .single();

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, status")
    .eq("project_id", projectId);

  const { data: members } = await supabase
    .from("organization_members")
    .select("user_id, role, profiles(id, full_name)")
    .eq("organization_id", orgId)
    .eq("status", "active");

  const { count: taskCount } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  const { count: doneCount } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("status", "done");

  const { count: chatCount } = await supabase
    .from("chat_rooms")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  const { count: fileCount } = await supabase
    .from("files")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  if (!project) {
    return <p className="text-muted-foreground">Project tidak ditemukan.</p>;
  }

  const progressPct =
    (taskCount ?? 0) > 0 ? Math.round(((doneCount ?? 0) / (taskCount ?? 0)) * 100) : 0;

  const tasksByStatus = TASK_STATUSES.map((status) => ({
    ...status,
    count: (tasks ?? []).filter((t) => t.status === status.value).length,
  }));

  return (
    <div className="space-y-6 pb-12">
      {/* Bento Hero Header */}
      <div className="relative overflow-hidden rounded-3xl border bg-card p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Badge className={`capitalize ${PROJECT_STATUS_STYLES[project.status]}`}>
                {project.status.replace("_", " ")}
              </Badge>
              <span className="text-xs text-muted-foreground font-medium">
                {project.ai_monitoring_enabled ? "✨ AI monitoring aktif" : "AI monitoring nonaktif"}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
            {project.description && (
              <p className="max-w-2xl text-sm text-muted-foreground whitespace-pre-wrap">
                {project.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/orgs/${orgId}/projects/${projectId}/board`}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
            >
              <GanttChartSquare className="h-4 w-4" />
              Buka Board
            </Link>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground pt-4 border-t">
          <span className="flex items-center gap-1.5 font-medium">
            <CalendarDays className="h-4 w-4 text-primary" />
            {formatDate(project.start_date)} — {formatDate(project.end_date)}
          </span>
          <Link
            href={`/orgs/${orgId}/projects/${projectId}/chat`}
            className="flex items-center gap-1.5 hover:text-foreground font-medium"
          >
            <MessageSquare className="h-4 w-4 text-blue-500" />
            {chatCount ?? 0} room chat
          </Link>
          <Link
            href={`/orgs/${orgId}/projects/${projectId}/files`}
            className="flex items-center gap-1.5 hover:text-foreground font-medium"
          >
            <FileText className="h-4 w-4 text-amber-500" />
            {fileCount ?? 0} file terlampir
          </Link>
        </div>
      </div>

      {/* Bento Grid Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Progress Bento Tile */}
        <div className="rounded-3xl border bg-card p-6 shadow-xs lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight">Progress Task Project</h2>
            <span className="text-xs font-semibold text-muted-foreground">
              {doneCount ?? 0} dari {taskCount ?? 0} selesai
            </span>
          </div>
          <div className="rounded-2xl border bg-muted/20 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
              <span>Penyelesaian Keseluruhan</span>
              <span className="text-foreground text-sm font-bold">{progressPct}%</span>
            </div>
            <Progress value={progressPct} className="h-2.5" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {tasksByStatus.map((s) => (
              <div
                key={s.value}
                className="rounded-2xl border bg-background/50 p-4 text-center shadow-xs transition-all hover:bg-muted/40"
              >
                <p className="text-2xl font-extrabold tracking-tight">{s.count}</p>
                <p className="text-xs font-medium text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Team Members Bento Tile */}
        <div className="rounded-3xl border bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-bold tracking-tight">Anggota Organisasi</h2>
          </div>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {(members ?? []).map((m) => (
              <div key={m.user_id} className="flex items-center gap-3 rounded-2xl border bg-background/50 p-3 transition-colors hover:bg-muted/40">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-xs font-bold text-primary">
                  {(
                    (m.profiles as unknown as { full_name?: string })?.full_name ??
                    "?"
                  )
                    .split(" ")
                    .map((s) => s[0])
                    .slice(0, 2)
                    .join("") || "U"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {(m.profiles as unknown as { full_name?: string })?.full_name ??
                      "Unknown"}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize font-medium">
                    {MEMBER_ROLE_LABELS[m.role] ?? m.role}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
