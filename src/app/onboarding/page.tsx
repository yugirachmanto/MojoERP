import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { PendingInvitations } from "@/components/onboarding/pending-invitations";
import { getMemberships, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getServerLanguage } from "@/lib/i18n/server";
import { translate } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Onboarding" };

export default async function OnboardingPage() {
  const user = await requireUser();
  const memberships = await getMemberships(user.id);

  if (memberships.length > 0) {
    const first = memberships[0];
    redirect(
      `/orgs/${first.organizations?.id ?? first.organization_id}/dashboard`
    );
  }

  const supabase = await createClient();
  const { data: pending } = await supabase
    .from("organization_members")
    .select("organization_id, role, invited_by, organizations(id, name)")
    .eq("user_id", user.id)
    .eq("status", "invited")
    .order("created_at", { ascending: true });

  const inviterIds = Array.from(
    new Set((pending ?? []).map((m) => m.invited_by).filter(Boolean))
  ) as string[];
  const { data: inviters } = inviterIds.length > 0
    ? await supabase.from("profiles").select("id, full_name").in("id", inviterIds)
    : { data: [] };
  const inviterMap = new Map(
    (inviters ?? []).map((p) => [p.id, p.full_name ?? null])
  );

  const invitations = (pending ?? []).map((m) => ({
    organization_id: m.organization_id,
    organization_name:
      (m.organizations as unknown as { name?: string } | null)?.name ?? "Organisasi",
    inviter_name: m.invited_by ? inviterMap.get(m.invited_by) ?? null : null,
    role: m.role,
  }));

  const lang = await getServerLanguage();
  const t = (key: Parameters<typeof translate>[1]) => translate(lang, key);

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("onboarding.welcome")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("onboarding.welcomeBody")}
        </p>
      </div>
      {invitations.length > 0 && (
        <div className="mb-6 w-full max-w-md">
          <PendingInvitations invitations={invitations} />
        </div>
      )}
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-lg">{t("onboarding.createOrgCard")}</CardTitle>
        </CardHeader>
        <CardContent>
          <OnboardingForm />
        </CardContent>
      </Card>
    </div>
  );
}
