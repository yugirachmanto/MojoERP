import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireOrg } from "@/lib/auth";
import { getOrCreateTaskRoom } from "@/server/actions/chat";
import { TaskDetail } from "@/components/tasks/task-detail";
import type { Tables } from "@/types/database";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Task" };

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ orgId: string; projectId: string; taskId: string }>;
}) {
  const { orgId, projectId, taskId } = await params;
  const membership = await requireOrg(orgId);
  const supabase = await createClient();

  const [
    { data: task },
    { data: subtasks },
    { data: activity },
    { data: members },
    { data: approvals },
    { data: org },
    { data: files },
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .eq("project_id", projectId)
      .maybeSingle(),
    supabase
      .from("subtasks")
      .select("*")
      .eq("task_id", taskId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("task_activity_log")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("organization_members")
      .select("user_id, role, profiles(id, full_name)")
      .eq("organization_id", orgId)
      .eq("status", "active"),
    supabase
      .from("task_approvals")
      .select("*")
      .eq("task_id", taskId)
      .order("step_number"),
    supabase
      .from("organizations")
      .select("role_order")
      .eq("id", orgId)
      .single(),
    supabase
      .from("files")
      .select("*, profiles(id, full_name)")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false }),
  ]);

  if (!task) {
    return <p className="text-sm text-muted-foreground">Task tidak ditemukan.</p>;
  }

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

  const memberOptions = Array.from(memberMap.entries()).map(([id, name]) => ({
    id,
    name,
  }));

  const room = await getOrCreateTaskRoom(projectId, taskId);
  let messages: (Tables<"chat_messages"> & { sender_name?: string })[] = [];
  if (room) {
    const { data } = await supabase
      .from("chat_messages")
      .select("*, profiles(id, full_name)")
      .eq("room_id", room.id)
      .order("created_at", { ascending: true })
      .limit(200);
    messages = (data ?? []).map((m) => ({
      ...m,
      sender_name:
        m.sender_type === "ai"
          ? "AI Agent"
          : (m.profiles as unknown as { full_name: string | null } | null)
              ?.full_name ?? "Unknown",
    }));
  }

  const parsedTask = {
    ...task,
    assignee_name: task.assignee_id
      ? memberMap.get(task.assignee_id) ?? null
      : null,
  };

  const parsedActivity = (activity ?? []).map((a) => ({
    ...a,
    actor_name: a.actor_id ? memberMap.get(a.actor_id) ?? null : null,
  }));

  const taskFiles = (files ?? []).map((f) => ({
    ...f,
    uploader_name:
      (f.profiles as unknown as { full_name: string | null } | null)?.full_name ??
      null,
  }));

  return (
    <TaskDetail
      orgId={orgId}
      projectId={projectId}
      task={parsedTask}
      subtasks={subtasks ?? []}
      activity={parsedActivity}
      members={memberOptions}
      currentUserId={membership.user_id}
      currentRole={membership.role}
      roleOrder={org?.role_order ?? []}
      approvals={approvals ?? []}
      roomId={room?.id ?? null}
      messages={messages}
      files={taskFiles}
    />
  );
}