import { notFound } from "next/navigation";
import { ProjectTabs } from "@/components/projects/project-tabs";
import { createClient } from "@/lib/supabase/server";
import { requireOrg } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgId: string; projectId: string }>;
}) {
  const { orgId, projectId } = await params;
  await requireOrg(orgId);

  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, name")
    .eq("id", projectId)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (!project) notFound();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{project.name}</h1>
      </div>
      <ProjectTabs orgId={orgId} projectId={projectId} />
      {children}
    </div>
  );
}