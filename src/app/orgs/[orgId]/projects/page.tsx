import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { requireOrg } from "@/lib/auth";
import { PROJECT_STATUS_STYLES } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { NewProjectDialog } from "@/components/projects/new-project-dialog";
import { getServerLanguage } from "@/lib/i18n/server";
import { translate } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  await requireOrg(orgId);
  const supabase = await createClient();
  const lang = await getServerLanguage();
  const t = (
    key: Parameters<typeof translate>[1],
    vars?: Record<string, string | number>
  ) => translate(lang, key, vars);

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  const { data: members } = await supabase
    .from("organization_members")
    .select("id, user_id, role, profiles(id, full_name)")
    .eq("organization_id", orgId)
    .eq("status", "active");

  const memberNames = new Map<string, string>();
  for (const m of members ?? []) {
    memberNames.set(
      m.user_id,
      (m.profiles as unknown as { full_name: string | null } | null)
        ?.full_name ?? m.user_id.slice(0, 8)
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user && !memberNames.has(user.id)) {
    memberNames.set(
      user.id,
      String(user.user_metadata?.full_name ?? "").trim() || user.id.slice(0, 8)
    );
  }

  const memberOptions = Array.from(memberNames, ([id, name]) => ({ id, name }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("projects.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("projects.count", { count: (projects ?? []).length })}
          </p>
        </div>
        <NewProjectDialog orgId={orgId} members={memberOptions} />
      </div>

      {!projects || projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-sm text-muted-foreground">{t("projects.empty")}</p>
            <NewProjectDialog orgId={orgId} members={memberOptions} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/orgs/${orgId}/projects/${project.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="flex h-full flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="line-clamp-2 text-base font-semibold">
                      {project.name}
                    </h3>
                    <Badge
                      className={`shrink-0 ${PROJECT_STATUS_STYLES[project.status]}`}
                    >
                      {project.status.replace("_", " ")}
                    </Badge>
                  </div>
                  {project.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {project.description}
                    </p>
                  )}
                  <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {formatDate(project.start_date)} — {formatDate(project.end_date)}
                    </span>
                    <span>
                      {project.ai_monitoring_enabled ? "AI aktif" : "AI nonaktif"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}