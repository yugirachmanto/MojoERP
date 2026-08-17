import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type OrgMembership = Tables<"organization_members"> & {
  organizations: Pick<Tables<"organizations">, "id" | "name" | "slug" | "logo_url"> | null;
};

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

export async function getMemberships(userId: string): Promise<OrgMembership[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_members")
    .select("*, organizations(id, name, slug, logo_url)")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at");

  if (error) throw error;
  return (data ?? []) as OrgMembership[];
}

export async function requireOrg(orgId: string): Promise<OrgMembership> {
  const user = await requireUser();
  const membership = await getMembership(orgId, user.id);
  if (!membership) redirect("/onboarding");
  return membership;
}

export async function getMembership(
  orgId: string,
  userId: string
): Promise<OrgMembership | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_members")
    .select("*, organizations(id, name, slug, logo_url)")
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw error;
  return data as OrgMembership | null;
}

export const ROLE_ORDER: Record<string, number> = {
  viewer: 0,
  member: 1,
  manager: 2,
  admin: 3,
  owner: 4,
};

export function hasRole(
  membership: OrgMembership | null | undefined,
  minRole: "viewer" | "member" | "manager" | "admin" | "owner"
): boolean {
  if (!membership) return false;
  return ROLE_ORDER[membership.role] >= ROLE_ORDER[minRole];
}

export function isOrgAdmin(membership: OrgMembership | null | undefined): boolean {
  if (!membership) return false;
  return membership.role === "owner" || membership.role === "admin";
}