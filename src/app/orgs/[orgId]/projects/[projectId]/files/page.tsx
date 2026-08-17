import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireOrg } from "@/lib/auth";
import { FileManager } from "@/components/files/file-manager";
import type { Tables } from "@/types/database";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Files" };

export default async function ProjectFilesPage({
  params,
}: {
  params: Promise<{ orgId: string; projectId: string }>;
}) {
  const { orgId, projectId } = await params;
  await requireOrg(orgId);
  const supabase = await createClient();

  const { data: files } = await supabase
    .from("files")
    .select("*, profiles(id, full_name)")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  const parsed: (Tables<"files"> & { uploader_name?: string | null })[] = (
    files ?? []
  ).map((f) => ({
    ...f,
    uploader_name:
      (f.profiles as unknown as { full_name: string | null } | null)?.full_name ??
      null,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {parsed.length} file dalam project.
        </p>
      </div>
      <FileManager orgId={orgId} projectId={projectId} files={parsed} />
    </div>
  );
}