"use server";

import { revalidatePath } from "next/cache";
import { ActionError, fail, ok, type ActionResult } from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import { requireOrg } from "@/lib/auth";
import { sendMessageSchema } from "@/lib/validators/chat";
import type { Tables } from "@/types/database";

export async function getProjectRoom(projectId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("chat_rooms")
    .select("*")
    .eq("project_id", projectId)
    .is("task_id", null)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  return data;
}

export async function getOrCreateTaskRoom(
  projectId: string,
  taskId: string
): Promise<Tables<"chat_rooms"> | null> {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("chat_rooms")
    .select("*")
    .eq("task_id", taskId)
    .maybeSingle();
  if (existing) return existing;

  const { data, error } = await supabase
    .from("chat_rooms")
    .insert({ project_id: projectId, task_id: taskId, name: "Task thread" })
    .select("*")
    .single();
  if (error) return null;
  return data;
}

export async function sendMessage(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = sendMessageSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Input tidak valid",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(new ActionError("Tidak terautentikasi"));

  const { data: room } = await supabase
    .from("chat_rooms")
    .select("project_id")
    .eq("id", parsed.data.room_id)
    .single();
  if (!room) return fail(new ActionError("Room tidak ditemukan"));

  const { data: project } = await supabase
    .from("projects")
    .select("organization_id")
    .eq("id", room.project_id)
    .single();
  if (!project) return fail(new ActionError("Project tidak ditemukan"));
  await requireOrg(project.organization_id);

  const { data: message, error } = await supabase
    .from("chat_messages")
    .insert({
      room_id: parsed.data.room_id,
      sender_id: user.id,
      sender_type: "user",
      content: parsed.data.content,
    })
    .select("id")
    .single();
  if (error) return fail(error);

  revalidatePath(`/orgs/${project.organization_id}/projects/${room.project_id}/chat`);
  return ok({ id: message.id });
}