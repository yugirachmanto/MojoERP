import { notFound } from "next/navigation";
import { AppShell } from "@/components/navigation/app-shell";
import { createClient } from "@/lib/supabase/server";
import { getMemberships, getUser, requireOrg } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const membership = await requireOrg(orgId);
  if (!membership.organizations) notFound();

  const [user, memberships] = await Promise.all([
    getUser(),
    getMemberships(membership.user_id),
  ]);

  const supabase = await createClient();
  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("organization_id", orgId)
    .eq("user_id", membership.user_id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <AppShell
      orgId={orgId}
      org={membership.organizations}
      memberships={memberships}
      user={{
        id: user?.id ?? "",
        email: user?.email ?? "",
        full_name: (user?.user_metadata?.full_name as string) ?? "",
      }}
      notifications={notifications ?? []}
    >
      {children}
    </AppShell>
  );
}