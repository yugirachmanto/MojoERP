import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireOrg } from "@/lib/auth";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { NewTaskDialog } from "@/components/tasks/new-task-dialog";
import { TASK_STATUSES } from "@/lib/constants";
import type { Tables } from "@/types/database";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Board" };

type Task = Tables<"tasks">;

export default async function BoardPage({
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
      .is("parent_task_id", null)
      .order("sort_order", { ascending: true })
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

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user && !memberMap.has(user.id)) {
    memberMap.set(
      user.id,
      String(user.user_metadata?.full_name ?? "").trim() || user.id.slice(0, 8)
    );
  }

  const boardTasks: (Task & { assignee_name?: string | null })[] = (tasks ?? []).map(
    (t) => ({
      ...t,
      assignee_name: t.assignee_id ? (memberMap.get(t.assignee_id) ?? null) : null,
    })
  );

  const memberOptions = Array.from(memberMap.entries()).map(([id, name]) => ({
    id,
    name,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Drag task antar kolom untuk mengubah status.
        </p>
        <NewTaskDialog projectId={projectId} members={memberOptions} />
      </div>
      <KanbanBoard
        orgId={orgId}
        projectId={projectId}
        tasks={boardTasks}
        columns={TASK_STATUSES.map((s) => s.value)}
      />
    </div>
  );
}