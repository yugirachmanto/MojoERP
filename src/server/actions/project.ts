"use server";

import { revalidatePath } from "next/cache";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import { requireOrg } from "@/lib/auth";
import { createProjectSchema, updateProjectSchema } from "@/lib/validators/project";

export async function createProject(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = createProjectSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Input tidak valid",
    };
  }
  const membership = await requireOrg(parsed.data.organization_id);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({
      organization_id: parsed.data.organization_id,
      name: parsed.data.name,
      description: parsed.data.description,
      start_date: parsed.data.start_date,
      end_date: parsed.data.end_date,
      owner_id: parsed.data.owner_id,
      status: parsed.data.status,
      ai_monitoring_enabled: parsed.data.ai_monitoring_enabled,
      created_by: membership.user_id,
    })
    .select("id")
    .single();
  if (error) return fail(error);

  await supabase.rpc("write_audit_log", {
    _org: parsed.data.organization_id,
    _action: "project.create",
    _entity_type: "project",
    _entity_id: data.id,
    _after: JSON.parse(JSON.stringify(parsed.data)),
  });

  revalidatePath(`/orgs/${parsed.data.organization_id}/projects`);
  return ok({ id: data.id });
}

export async function updateProject(
  orgId: string,
  projectId: string,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = updateProjectSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Input tidak valid",
    };
  }
  await requireOrg(orgId);

  const supabase = await createClient();
  const { data: before } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  const { data, error } = await supabase
    .from("projects")
    .update(parsed.data)
    .eq("id", projectId)
    .select("id")
    .single();
  if (error) return fail(error);

  await supabase.rpc("write_audit_log", {
    _org: orgId,
    _action: "project.update",
    _entity_type: "project",
    _entity_id: projectId,
    _before: before ? JSON.parse(JSON.stringify(before)) : null,
    _after: JSON.parse(JSON.stringify(parsed.data)),
  });

  revalidatePath(`/orgs/${orgId}/projects/${projectId}`);
  revalidatePath(`/orgs/${orgId}/projects`);
  return ok({ id: data.id });
}

export async function deleteProject(
  orgId: string,
  projectId: string
): Promise<ActionResult> {
  await requireOrg(orgId);

  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId)
    .eq("organization_id", orgId);
  if (error) return fail(error);

  revalidatePath(`/orgs/${orgId}/projects`);
  return ok();
}