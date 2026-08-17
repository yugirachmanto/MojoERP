import type { Metadata } from "next";
import {
  Building2,
  GitBranch,
  Languages,
  Sparkles,
  ListOrdered,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { requireOrg, isOrgAdmin } from "@/lib/auth";
import { OrgSettingsForm } from "@/components/settings/org-settings-form";
import { LanguageSetting } from "@/components/settings/language-setting";
import { RoleHierarchyEditor } from "@/components/settings/role-hierarchy-editor";
import { DepartmentsCard } from "@/components/settings/departments-card";
import { DEFAULT_LANGUAGE, translate, type Language } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Settings" };

const ROLE_LABELS: Record<string, string> = {
  project_lead: "Project Lead",
  manager: "Manager",
  director: "Director",
};

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const membership = await requireOrg(orgId);
  const isAdmin = isOrgAdmin(membership);
  const supabase = await createClient();

  const [{ data: org }, { data: profile }, { data: departments }] =
    await Promise.all([
      supabase
        .from("organizations")
        .select("name, timezone, approval_flow_id, role_order")
        .eq("id", orgId)
        .single(),
      supabase
        .from("profiles")
        .select("language")
        .eq("id", membership.user_id)
        .single(),
      supabase
        .from("departments")
        .select("id, name")
        .eq("organization_id", orgId)
        .order("name"),
    ]);

  const lang: Language =
    profile?.language === "id" || profile?.language === "en"
      ? profile.language
      : DEFAULT_LANGUAGE;
  const t = (key: Parameters<typeof translate>[1]) => translate(lang, key);

  const { data: steps } = org?.approval_flow_id
    ? await supabase
        .from("approval_steps")
        .select("step_number, required_role")
        .eq("flow_id", org.approval_flow_id)
        .order("step_number")
    : { data: [] };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("settings.title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("settings.subtitle")}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("settings.orgInfo")}</CardTitle>
            <CardDescription>{t("settings.orgInfoDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <OrgSettingsForm
              orgId={orgId}
              initialName={org?.name ?? ""}
              initialTimezone={org?.timezone ?? "UTC"}
            />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <GitBranch className="h-4 w-4" />
                {t("settings.approvalFlow")}
              </CardTitle>
              <CardDescription>{t("settings.approvalFlowDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              {steps && steps.length > 0 ? (
                <ol className="space-y-2">
                  {steps.map((step) => (
                    <li
                      key={step.step_number}
                      className="flex items-center gap-3 rounded-lg border p-3"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {step.step_number}
                      </span>
                      <span className="text-sm font-medium">
                        {ROLE_LABELS[step.required_role] ?? step.required_role}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("settings.noApprovalFlow")}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4" />
                {t("settings.aiIntegration")}
              </CardTitle>
              <CardDescription>{t("settings.aiIntegrationDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {t("settings.aiIntegrationBody")}
              </p>
            </CardContent>
          </Card>

          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ListOrdered className="h-4 w-4" />
                  Hierarki Peran
                </CardTitle>
                <CardDescription>
                  Urutkan hierarki peran (tertinggi di atas). Saat staff
                  menyelesaikan task, persetujuan dibaca dari peran tepat di
                  atasnya ke atas sesuai urutan ini.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RoleHierarchyEditor
                  orgId={orgId}
                  initialRoleOrder={org?.role_order ?? []}
                />
              </CardContent>
            </Card>
          )}

          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4" />
                  Department
                </CardTitle>
                <CardDescription>
                  Kelola daftar departemen untuk ditempatkan ke anggota.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DepartmentsCard
                  orgId={orgId}
                  departments={(departments ?? []).map((d) => ({
                    id: d.id,
                    name: d.name,
                  }))}
                />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Languages className="h-4 w-4" />
                {t("settings.myPreferences")}
              </CardTitle>
              <CardDescription>{t("settings.myPreferencesDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <p className="text-sm font-medium">{t("settings.language")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("settings.languageHelp")}
                </p>
              </div>
              <LanguageSetting />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}