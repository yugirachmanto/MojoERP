"use server";

import { revalidatePath } from "next/cache";
import { ActionError, fail, ok, type ActionResult } from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import { requireOrg } from "@/lib/auth";
import {
  createTaskSchema,
  moveTaskSchema,
  toggleSubtaskSchema,
  updateTaskSchema,
} from "@/lib/validators/task";

async function getProjectOrg(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string
) {
  const { data, error } = await supabase
    .from("projects")
    .select("organization_id")
    .eq("id", projectId)
    .single();
  if (error || !data) throw new ActionError("Project tidak ditemukan");
  return data.organization_id;
}

export async function createTask(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = createTaskSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Input tidak valid",
    };
  }

  const supabase = await createClient();
  const orgId = await getProjectOrg(supabase, parsed.data.project_id);
  const membership = await requireOrg(orgId);

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      project_id: parsed.data.project_id,
      title: parsed.data.title,
      description: parsed.data.description,
      assignee_id: parsed.data.assignee_id,
      parent_task_id: parsed.data.parent_task_id,
      start_date: parsed.data.start_date,
      due_date: parsed.data.due_date,
      priority: parsed.data.priority,
      status: parsed.data.status,
      estimated_hours: parsed.data.estimated_hours,
      labels: parsed.data.labels,
      approval_depth: parsed.data.approval_depth,
      created_by: membership.user_id,
    })
    .select("id")
    .single();
  if (error) return fail(error);

  revalidatePath(`/orgs/${orgId}/projects/${parsed.data.project_id}`);
  revalidatePath(`/orgs/${orgId}/projects/${parsed.data.project_id}/board`);
  return ok({ id: data.id });
}

export async function updateTask(
  projectId: string,
  taskId: string,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = updateTaskSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Input tidak valid",
    };
  }

  const supabase = await createClient();
  const orgId = await getProjectOrg(supabase, projectId);
  await requireOrg(orgId);

  const wantsDone = parsed.data.status === "done";
  let effectiveStatus = parsed.data.status;
  if (wantsDone) {
    const { data: existing } = await supabase
      .from("tasks")
      .select("assignee_id, approval_depth")
      .eq("id", taskId)
      .eq("project_id", projectId)
      .single();
    const depth = existing?.approval_depth ?? 0;
    if (depth > 0) {
      const chainError = await startApprovalChain(
        supabase,
        orgId,
        taskId,
        existing?.assignee_id ?? null,
        depth
      );
      if (chainError) return fail(chainError);
      effectiveStatus = "review";
    }
  }

  const { data, error } = await supabase
    .from("tasks")
    .update({ ...parsed.data, status: effectiveStatus })
    .eq("id", taskId)
    .eq("project_id", projectId)
    .select("id")
    .single();
  if (error) return fail(error);

  revalidatePath(`/orgs/${orgId}/projects/${projectId}`);
  revalidatePath(`/orgs/${orgId}/projects/${projectId}/board`);
  revalidatePath(`/orgs/${orgId}/projects/${projectId}/tasks/${taskId}`);
  return ok({ id: data.id });
}

export async function deleteTask(
  projectId: string,
  taskId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const orgId = await getProjectOrg(supabase, projectId);
  await requireOrg(orgId);

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId)
    .eq("project_id", projectId);
  if (error) return fail(error);

  revalidatePath(`/orgs/${orgId}/projects/${projectId}/board`);
  return ok();
}

export async function moveTask(input: unknown): Promise<ActionResult> {
  const parsed = moveTaskSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Input tidak valid",
    };
  }

  const supabase = await createClient();
  const { data: task } = await supabase
    .from("tasks")
    .select("project_id, assignee_id, approval_depth")
    .eq("id", parsed.data.task_id)
    .single();
  if (!task) return fail(new ActionError("Task tidak ditemukan"));

  const orgId = await getProjectOrg(supabase, task.project_id);
  await requireOrg(orgId);

  // Completing a task that requires approval starts the approval chain instead.
  const needsApproval =
    parsed.data.status === "done" &&
    (task.approval_depth ?? 0) > 0;
  if (needsApproval) {
    const chainError = await startApprovalChain(
      supabase,
      orgId,
      parsed.data.task_id,
      task.assignee_id,
      task.approval_depth ?? 0
    );
    if (chainError) return fail(chainError);

    const { error } = await supabase
      .from("tasks")
      .update({
        status: "review",
        sort_order: parsed.data.sort_order,
      })
      .eq("id", parsed.data.task_id);
    if (error) return fail(error);
  } else {
    const { error } = await supabase
      .from("tasks")
      .update({ status: parsed.data.status, sort_order: parsed.data.sort_order })
      .eq("id", parsed.data.task_id);
    if (error) return fail(error);
  }

  revalidatePath(`/orgs/${orgId}/projects/${task.project_id}/board`);
  return ok();
}

export async function addSubtask(
  projectId: string,
  taskId: string,
  title: string
): Promise<ActionResult> {
  const titleParsed = title.trim();
  if (!titleParsed) return fail(new ActionError("Judul subtask wajib diisi"));

  const supabase = await createClient();
  const orgId = await getProjectOrg(supabase, projectId);
  await requireOrg(orgId);

  const { error } = await supabase.from("subtasks").insert({
    task_id: taskId,
    title: titleParsed,
  });
  if (error) return fail(error);

  revalidatePath(`/orgs/${orgId}/projects/${projectId}/tasks/${taskId}`);
  return ok();
}

export async function toggleSubtask(input: unknown): Promise<ActionResult> {
  const parsed = toggleSubtaskSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Input tidak valid",
    };
  }

  const supabase = await createClient();
  const { data: subtask } = await supabase
    .from("subtasks")
    .select("task_id")
    .eq("id", parsed.data.subtask_id)
    .single();
  if (!subtask) return fail(new ActionError("Subtask tidak ditemukan"));

  const { data: task } = await supabase
    .from("tasks")
    .select("project_id")
    .eq("id", subtask.task_id)
    .single();
  if (!task) return fail(new ActionError("Task tidak ditemukan"));

  const orgId = await getProjectOrg(supabase, task.project_id);
  await requireOrg(orgId);

  const { error } = await supabase
    .from("subtasks")
    .update({ done: parsed.data.done })
    .eq("id", parsed.data.subtask_id);
  if (error) return fail(error);

  revalidatePath(`/orgs/${orgId}/projects/${task.project_id}/tasks/${subtask.task_id}`);
  return ok();
}

async function resolveApprovalChain(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  assigneeId: string | null
) {
  const { data: org } = await supabase
    .from("organizations")
    .select("role_order")
    .eq("id", orgId)
    .single();
  const roleOrder =
    org?.role_order && org.role_order.length > 0
      ? org.role_order
      : ["owner", "admin", "manager", "member", "viewer"];

  let assigneeIndex = -1;
  if (assigneeId) {
    const { data: member } = await supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", orgId)
      .eq("user_id", assigneeId)
      .eq("status", "active")
      .maybeSingle();
    if (member) assigneeIndex = roleOrder.indexOf(member.role);
  }
  if (assigneeIndex < 0) assigneeIndex = roleOrder.length;

  return { roleOrder, assigneeIndex };
}

async function startApprovalChain(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  taskId: string,
  assigneeId: string | null,
  depth: number
) {
  const { roleOrder, assigneeIndex } = await resolveApprovalChain(
    supabase,
    orgId,
    assigneeId
  );

  // Roles strictly above the assignee, immediate superior first, limited by depth.
  const chain = roleOrder
    .slice(Math.max(0, assigneeIndex - depth), assigneeIndex)
    .reverse();

  const { error: deleteError } = await supabase
    .from("task_approvals")
    .delete()
    .eq("task_id", taskId);
  if (deleteError) return deleteError;

  const { error: insertError } = await supabase.from("task_approvals").insert(
    chain.map((role, index) => ({
      task_id: taskId,
      step_number: index + 1,
      required_role: role,
      status: "pending",
    }))
  );
  if (insertError) return insertError;
  return null;
}

export async function submitTaskForApproval(
  projectId: string,
  taskId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const orgId = await getProjectOrg(supabase, projectId);
  await requireOrg(orgId);

  const { data: task } = await supabase
    .from("tasks")
    .select("assignee_id, approval_depth")
    .eq("id", taskId)
    .eq("project_id", projectId)
    .single();
  if (!task) return fail(new ActionError("Task tidak ditemukan"));

  const depth = task.approval_depth ?? 0;
  if (depth <= 0) {
    return fail(new ActionError("Task ini tidak memerlukan persetujuan"));
  }

  const chainError = await startApprovalChain(
    supabase,
    orgId,
    taskId,
    task.assignee_id,
    depth
  );
  if (chainError) return fail(chainError);

  const { error: updateError } = await supabase
    .from("tasks")
    .update({ status: "review" })
    .eq("id", taskId)
    .eq("project_id", projectId);
  if (updateError) return fail(updateError);

  revalidatePath(`/orgs/${orgId}/projects/${projectId}/tasks/${taskId}`);
  revalidatePath(`/orgs/${orgId}/projects/${projectId}/board`);
  return ok();
}

export async function decideApproval(
  projectId: string,
  taskId: string,
  approvalId: string,
  decision: "approve" | "reject",
  comment: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const orgId = await getProjectOrg(supabase, projectId);
  const membership = await requireOrg(orgId);

  const { data: task } = await supabase
    .from("tasks")
    .select("id")
    .eq("id", taskId)
    .eq("project_id", projectId)
    .single();
  if (!task) return fail(new ActionError("Task tidak ditemukan"));

  const { data: steps } = await supabase
    .from("task_approvals")
    .select("id, step_number, required_role, status")
    .eq("task_id", taskId)
    .order("step_number");
  if (!steps || steps.length === 0) {
    return fail(new ActionError("Task belum diajukan untuk persetujuan"));
  }

  const target = steps.find((s) => s.id === approvalId);
  if (!target) return fail(new ActionError("Langkah approval tidak ditemukan"));
  if (target.status !== "pending") {
    return fail(new ActionError("Langkah ini sudah diputuskan"));
  }

  // Enforce the chain order: only the first pending step may be decided.
  const firstPending = steps.find((s) => s.status === "pending");
  if (firstPending && firstPending.id !== approvalId) {
    return fail(new ActionError("Selesaikan langkah persetujuan sebelumnya dulu"));
  }

  const { roleOrder } = await resolveApprovalChain(supabase, orgId, null);
  const userRank = roleOrder.indexOf(membership.role);
  const requiredRank = roleOrder.indexOf(target.required_role);
  if (userRank < 0 || requiredRank < 0 || userRank > requiredRank) {
    return fail(
      new ActionError("Peran kamu tidak memenuhi syarat untuk langkah ini")
    );
  }

  const { error: updateError } = await supabase
    .from("task_approvals")
    .update({
      status: decision === "approve" ? "approved" : "rejected",
      approver_id: membership.user_id,
      comment: comment.trim() || null,
      decided_at: new Date().toISOString(),
    })
    .eq("id", approvalId)
    .eq("task_id", taskId);
  if (updateError) return fail(updateError);

  if (decision === "approve") {
    const allApproved = steps.every(
      (s) => s.id === approvalId || s.status === "approved"
    );
    if (allApproved) {
      const { error: doneError } = await supabase
        .from("tasks")
        .update({ status: "done" })
        .eq("id", taskId)
        .eq("project_id", projectId);
      if (doneError) return fail(doneError);
    }
  } else {
    const { error: reopenError } = await supabase
      .from("tasks")
      .update({ status: "in_progress" })
      .eq("id", taskId)
      .eq("project_id", projectId);
    if (reopenError) return fail(reopenError);
  }

  revalidatePath(`/orgs/${orgId}/projects/${projectId}/tasks/${taskId}`);
  revalidatePath(`/orgs/${orgId}/projects/${projectId}/board`);
  return ok();
}