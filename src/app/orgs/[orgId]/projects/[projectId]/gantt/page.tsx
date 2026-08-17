import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireOrg } from "@/lib/auth";
import { ProjectGantt } from "@/components/gantt/project-gantt";
import type { Tables } from "@/types/database";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Gantt Chart" };

type Task = Tables<"tasks">;

export default async function ProjectGanttPage({
  params,
}: {
  params: Promise<{ orgId: string; projectId: string }>;
}) {
  const { orgId, projectId } = await params;
  await requireOrg(orgId);
  const supabase = await createClient();

  const [{ data: tasks }, { data: members }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true }),
    supabase
      .from("organization_members")
      .select("user_id, role, profiles(id, full_name)")
      .eq("organization_id", orgId)
      .eq("status", "active"),
  ]);

  const memberMap = new Map(
    (members ?? []).map((m) => [
      m.user_id,
      (m.profiles as unknown as { full_name: string | null } | null)?.full_name ??
        m.user_id.slice(0, 8),
    ])
  );

  const ganttTasks: (Task & { assignee_name?: string | null })[] = (tasks ?? []).map(
    (t) => ({
      ...t,
      assignee_name: t.assignee_id ? (memberMap.get(t.assignee_id) ?? null) : null,
    })
  );

  return (
    <div className="space-y-4">
      <ProjectGantt orgId={orgId} projectId={projectId} tasks={ganttTasks} />
    </div>
  );
}