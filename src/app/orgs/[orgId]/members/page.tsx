import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireOrg, isOrgAdmin } from "@/lib/auth";
import { MembersManager } from "@/components/members/members-manager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Members" };

export default async function MembersPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const membership = await requireOrg(orgId);
  const supabase = await createClient();

  const { data: departments } = await supabase
    .from("departments")
    .select("id, name")
    .eq("organization_id", orgId)
    .order("name");

  const { data: members } = await supabase
    .from("organization_members")
    .select("*, profiles(id, full_name, avatar_url), departments(id, name)")
    .eq("organization_id", orgId)
    .neq("status", "removed")
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
          <p className="text-sm text-muted-foreground">
            Kelola anggota dan peran dalam organisasi.
          </p>
        </div>
      </div>
      <MembersManager
        orgId={orgId}
        isAdmin={isOrgAdmin(membership)}
        departments={(departments ?? []).map((d) => ({ id: d.id, name: d.name }))}
        members={(members ?? []).map((m) => ({
          id: m.id,
          user_id: m.user_id,
          role: m.role,
          status: m.status,
          approval_level: m.approval_level,
          department_id: m.department_id,
          department_name:
            (m.departments as unknown as { name?: string } | null)?.name ?? null,
          name:
            (m.profiles as unknown as { full_name?: string | null })?.full_name ??
            "Unknown",
          isSelf: m.user_id === membership.user_id,
        }))}
      />
    </div>
  );
}
