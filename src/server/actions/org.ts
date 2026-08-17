"use server";

import { revalidatePath } from "next/cache";
import { ActionError, fail, ok, type ActionResult } from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendResendEmail } from "@/lib/email/resend";
import { requireOrg, isOrgAdmin } from "@/lib/auth";
import {
  createOrganizationSchema,
  departmentSchema,
  inviteMemberSchema,
  updateMemberSchema,
  updateOrganizationSchema,
  updateRoleOrderSchema,
} from "@/lib/validators/org";

export async function createOrganization(
  input: unknown
): Promise<ActionResult<{ organization_id: string }>> {
  const parsed = createOrganizationSchema.safeParse(input);
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

  const companyName =
    parsed.data.name ||
    String(user.user_metadata?.full_name ?? "").trim() ||
    "Workspace";

  const { data: orgId, error } = await supabase.rpc("bootstrap_organization", {
    _name: companyName,
    _timezone: parsed.data.timezone,
  });

  if (error) return fail(error);
  revalidatePath("/onboarding", "layout");
  return ok({ organization_id: orgId as string });
}

export async function updateOrganization(
  orgId: string,
  input: unknown
): Promise<ActionResult> {
  const parsed = updateOrganizationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Input tidak valid",
    };
  }
  await requireOrg(orgId);

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({ name: parsed.data.name, timezone: parsed.data.timezone })
    .eq("id", orgId);
  if (error) return fail(error);

  revalidatePath(`/orgs/${orgId}/settings`);
  return ok();
}

export async function inviteMember(
  orgId: string,
  input: unknown
): Promise<ActionResult<{ actionLink: string }>> {
  const parsed = inviteMemberSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Input tidak valid",
    };
  }
  const membership = await requireOrg(orgId);
  if (!isOrgAdmin(membership)) {
    return fail(new ActionError("Hanya admin yang dapat mengundang anggota"));
  }

  const service = await createServiceClient();
  if (!service) {
    return fail(
      new ActionError("SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi di server")
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { data: linkData, error: linkError } = await service.auth.admin.generateLink({
    type: "invite",
    email: parsed.data.email,
    options: {
      redirectTo: `${siteUrl}/auth/callback?next=/onboarding`,
      data: {
        invited_by: membership.user_id,
        invited_org_id: orgId,
      },
    },
  });
  if (linkError || !linkData.user || !linkData.properties?.action_link) {
    return fail(linkError ?? new ActionError("Gagal membuat link undangan"));
  }

  const targetId = linkData.user.id;
  const actionLink = linkData.properties.action_link;

  const supabase = await createClient();
  const { error: insertError } = await supabase.from("organization_members").upsert(
    {
      organization_id: orgId,
      user_id: targetId,
      role: parsed.data.role,
      approval_level: parsed.data.approval_level,
      department_id: parsed.data.department_id ?? null,
      status: "invited",
      invited_by: membership.user_id,
    },
    { onConflict: "organization_id,user_id" }
  );
  if (insertError) return fail(insertError);

  revalidatePath(`/orgs/${orgId}/settings`);
  revalidatePath(`/orgs/${orgId}/members`);
  return ok({ actionLink });
}

export async function acceptInvitation(orgId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const service = await createServiceClient();
  if (!service) {
    return fail(
      new ActionError("SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi di server")
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(new ActionError("Tidak terautentikasi"));

  const { data: invite, error: fetchError } = await service
    .from("organization_members")
    .select("id, invited_by, organizations(id, name)")
    .eq("organization_id", orgId)
    .eq("user_id", user.id)
    .eq("status", "invited")
    .maybeSingle();
  if (fetchError) return fail(fetchError);
  if (!invite) return fail(new ActionError("Undangan tidak ditemukan"));

  const { error: updateError } = await service
    .from("organization_members")
    .update({ status: "active" })
    .eq("id", invite.id)
    .eq("status", "invited");
  if (updateError) return fail(updateError);

  revalidatePath("/onboarding");
  revalidatePath(`/orgs/${orgId}/dashboard`);
  revalidatePath(`/orgs/${orgId}/members`);
  return ok();
}

export async function updateMemberRole(
  orgId: string,
  memberId: string,
  input: unknown
): Promise<ActionResult> {
  const parsed = updateMemberSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Input tidak valid",
    };
  }
  const membership = await requireOrg(orgId);
  if (!isOrgAdmin(membership)) {
    return fail(new ActionError("Hanya admin yang dapat mengubah peran"));
  }
  if (parsed.data.role === "owner") {
    return fail(new ActionError("Peran Owner hanya untuk pendiri organisasi"));
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_members")
    .update({
      role: parsed.data.role,
      approval_level: parsed.data.approval_level,
      department_id: parsed.data.department_id ?? null,
    })
    .eq("id", memberId)
    .eq("organization_id", orgId);
  if (error) return fail(error);

  revalidatePath(`/orgs/${orgId}/settings`);
  revalidatePath(`/orgs/${orgId}/members`);
  return ok();
}

export async function removeMember(
  orgId: string,
  memberId: string
): Promise<ActionResult> {
  const membership = await requireOrg(orgId);
  if (!isOrgAdmin(membership)) {
    return fail(new ActionError("Hanya admin yang dapat menghapus anggota"));
  }

  const supabase = await createClient();
  const { data: target } = await supabase
    .from("organization_members")
    .select("role")
    .eq("id", memberId)
    .eq("organization_id", orgId)
    .single();
  if (target?.role === "owner") {
    return fail(new ActionError("Owner tidak dapat dihapus"));
  }

  const { error } = await supabase
    .from("organization_members")
    .update({ status: "removed" })
    .eq("id", memberId)
    .eq("organization_id", orgId);
  if (error) return fail(error);

  revalidatePath(`/orgs/${orgId}/settings`);
  revalidatePath(`/orgs/${orgId}/members`);
  return ok();
}

export async function updateRoleOrder(
  orgId: string,
  input: unknown
): Promise<ActionResult> {
  const parsed = updateRoleOrderSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Input tidak valid",
    };
  }
  const membership = await requireOrg(orgId);
  if (!isOrgAdmin(membership)) {
    return fail(new ActionError("Hanya admin yang dapat mengubah hierarki"));
  }
  if (parsed.data.role_order[0] !== "owner") {
    return fail(new ActionError("Owner harus berada di posisi teratas"));
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({ role_order: parsed.data.role_order })
    .eq("id", orgId);
  if (error) return fail(error);

  revalidatePath(`/orgs/${orgId}/settings`);
  return ok();
}

export async function createDepartment(
  orgId: string,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = departmentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Input tidak valid",
    };
  }
  const membership = await requireOrg(orgId);
  if (!isOrgAdmin(membership)) {
    return fail(new ActionError("Hanya admin yang dapat menambah department"));
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("departments")
    .insert({ organization_id: orgId, name: parsed.data.name })
    .select("id")
    .single();
  if (error) return fail(error);

  revalidatePath(`/orgs/${orgId}/settings`);
  revalidatePath(`/orgs/${orgId}/members`);
  return ok({ id: data.id });
}

export async function deleteDepartment(
  orgId: string,
  departmentId: string
): Promise<ActionResult> {
  const membership = await requireOrg(orgId);
  if (!isOrgAdmin(membership)) {
    return fail(new ActionError("Hanya admin yang dapat menghapus department"));
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("departments")
    .delete()
    .eq("id", departmentId)
    .eq("organization_id", orgId);
  if (error) return fail(error);

  revalidatePath(`/orgs/${orgId}/settings`);
  revalidatePath(`/orgs/${orgId}/members`);
  return ok();
}
