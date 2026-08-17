import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireOrg } from "@/lib/auth";
import { TaskListView } from "@/components/tasks/task-list-view";
import { NewTaskDialog } from "@/components/tasks/new-task-dialog";
import type { Tables } from "@/types/database";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Tasks" };

type Task = Tables<"tasks"> & { assignee_name?: string | null };

export default async function ProjectTasksPage({
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
      .order("created_at", { ascending: false }),
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

  const tasksList: Task[] = (tasks ?? []).map((t) => ({
    ...t,
    assignee_name: t.assignee_id ? memberMap.get(t.assignee_id) ?? null : null,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <NewTaskDialog
          projectId={projectId}
          members={(members ?? []).map((m) => ({
            id: m.user_id,
            name: memberMap.get(m.user_id) ?? m.user_id.slice(0, 8),
          }))}
        />
      </div>
      <TaskListView orgId={orgId} projectId={projectId} tasks={tasksList} />
    </div>
  );
}