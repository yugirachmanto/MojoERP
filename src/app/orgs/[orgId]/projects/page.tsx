import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { requireOrg } from "@/lib/auth";
import { PROJECT_STATUS_STYLES } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { NewProjectDialog } from "@/components/projects/new-project-dialog";
import { getServerLanguage } from "@/lib/i18n/server";
import { translate } from "@/lib/i18n";
import { FolderKanban } from "lucide-react";

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
    <div className="space-y-6 pb-12">
      {/* Bento Hero Header */}
      <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/10 via-background to-muted/40 p-8 shadow-sm">
        <div className="absolute right-6 top-6 hidden md:block opacity-20">
          <FolderKanban className="h-32 w-32 text-primary" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              Workspace Projects
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{t("projects.title")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("projects.count", { count: (projects ?? []).length })}
            </p>
          </div>
          <NewProjectDialog orgId={orgId} members={memberOptions} />
        </div>
      </div>

      {!projects || projects.length === 0 ? (
        <div className="rounded-3xl border border-dashed p-16 text-center space-y-4 bg-card">
          <p className="text-sm text-muted-foreground">{t("projects.empty")}</p>
          <NewProjectDialog orgId={orgId} members={memberOptions} />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/orgs/${orgId}/projects/${project.id}`}>
              <div className="group h-full rounded-3xl border bg-card p-6 shadow-xs transition-all hover:shadow-md hover:scale-[1.01] flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="line-clamp-2 text-base font-bold group-hover:text-primary transition-colors">
                      {project.name}
                    </h3>
                    <Badge
                      className={`shrink-0 capitalize ${PROJECT_STATUS_STYLES[project.status]}`}
                    >
                      {project.status.replace("_", " ")}
                    </Badge>
                  </div>
                  {project.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {project.description}
                    </p>
                  )}
                </div>
                <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground pt-3 border-t">
                  <span className="font-medium">
                    {formatDate(project.start_date)} — {formatDate(project.end_date)}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {project.ai_monitoring_enabled ? "AI aktif" : "AI nonaktif"}
                  </Badge>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
