"use server";

import { revalidatePath } from "next/cache";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import { requireOrg } from "@/lib/auth";

export async function markNotificationRead(
  notificationId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId);
  if (error) return fail(error);
  revalidatePath("/", "layout");
  return ok();
}

export async function markAllNotificationsRead(
  orgId: string
): Promise<ActionResult> {
  await requireOrg(orgId);
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("organization_id", orgId)
    .is("read_at", null);
  if (error) return fail(error);
  revalidatePath("/", "layout");
  return ok();
}