"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { ActionError, fail, ok, type ActionResult } from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import { requireOrg } from "@/lib/auth";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

export async function uploadFile(
  orgId: string,
  projectId: string,
  formData: FormData,
  taskId?: string
): Promise<ActionResult<{ id: string }>> {
  const membership = await requireOrg(orgId);

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return fail(new ActionError("File tidak ditemukan di form"));
  }

  if (file.size > MAX_FILE_SIZE) {
    return fail(new ActionError("Ukuran file maksimal 25 MB"));
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const hash = sha256(bytes);
  const ext = file.name.split(".").pop();
  const storageName = `${crypto.randomUUID()}_${ext ? sanitize(ext) : "bin"}`;
  const storagePath = `${orgId}/${projectId}/${storageName}`;

  const supabase = await createClient();

  const { error: uploadError } = await supabase.storage
    .from("project-files")
    .upload(storagePath, bytes, {
      contentType: file.type || "application/octet-stream",
    });
  if (uploadError) return fail(uploadError);

  const { data, error } = await supabase
    .from("files")
    .insert({
      organization_id: orgId,
      project_id: projectId,
      task_id: taskId ?? null,
      owner_type: taskId ? "task" : "project",
      storage_path: storagePath,
      file_name: file.name,
      mime_type: file.type || null,
      size_bytes: file.size,
      uploaded_by: membership.user_id,
      content_hash: hash,
    })
    .select("id")
    .single();

  if (error) {
    await supabase.storage.from("project-files").remove([storagePath]);
    return fail(error);
  }

  const base = taskId
    ? `/orgs/${orgId}/projects/${projectId}/tasks/${taskId}`
    : `/orgs/${orgId}/projects/${projectId}/files`;
  revalidatePath(base);
  return ok({ id: data.id });
}

export async function deleteFile(
  orgId: string,
  fileId: string
): Promise<ActionResult> {
  await requireOrg(orgId);

  const supabase = await createClient();
  const { data: file, error: fetchError } = await supabase
    .from("files")
    .select("id, storage_path")
    .eq("id", fileId)
    .eq("organization_id", orgId)
    .single();
  if (fetchError || !file) return fail(new ActionError("File tidak ditemukan"));

  await supabase.storage.from("project-files").remove([file.storage_path]);
  const { error } = await supabase
    .from("files")
    .delete()
    .eq("id", fileId)
    .eq("organization_id", orgId);
  if (error) return fail(error);

  revalidatePath(`/orgs/${orgId}`);
  return ok();
}

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9.]/g, "").slice(0, 16);
}