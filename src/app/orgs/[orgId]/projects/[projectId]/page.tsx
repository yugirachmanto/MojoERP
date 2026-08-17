import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarDays,
  MessageSquare,
  Users,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { createClient } from "@/lib/supabase/server";
import { requireOrg } from "@/lib/auth";
import { PROJECT_STATUS_STYLES, TASK_STATUSES, MEMBER_ROLE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Project" };

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
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Badge className={PROJECT_STATUS_STYLES[project.status]}>
              {project.status.replace("_", " ")}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {project.ai_monitoring_enabled
                ? "AI monitoring aktif"
                : "AI monitoring nonaktif"}
            </span>
          </div>
          {project.description && (
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {project.description}
            </p>
          )}
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" />
              {formatDate(project.start_date)} — {formatDate(project.end_date)}
            </span>
            <Link
              href={`/orgs/${orgId}/projects/${projectId}/chat`}
              className="flex items-center gap-1.5 hover:text-foreground"
            >
              <MessageSquare className="h-4 w-4" />
              {chatCount ?? 0} room chat
            </Link>
            <Link
              href={`/orgs/${orgId}/projects/${projectId}/files`}
              className="flex items-center gap-1.5 hover:text-foreground"
            >
              <FileText className="h-4 w-4" />
              {fileCount ?? 0} file
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Progress Task</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {doneCount ?? 0} dari {taskCount ?? 0} task selesai
                  </span>
                  <span className="font-medium">{progressPct}%</span>
                </div>
                <Progress value={progressPct} />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {tasksByStatus.map((s) => (
                  <div
                    key={s.value}
                    className="rounded-lg border p-3 text-center"
                  >
                    <p className="text-xl font-semibold">{s.count}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              Anggota Organisasi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {(members ?? []).map((m) => (
              <div key={m.user_id} className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
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
                  <p className="truncate text-sm font-medium">
                    {(m.profiles as unknown as { full_name?: string })?.full_name ??
                      "Unknown"}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {MEMBER_ROLE_LABELS[m.role] ?? m.role}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}