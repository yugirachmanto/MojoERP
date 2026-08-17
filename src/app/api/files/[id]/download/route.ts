import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: file, error } = await supabase
    .from("files")
    .select("id, storage_path, file_name, mime_type, owner_type")
    .eq("id", id)
    .maybeSingle();

  if (error || !file) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const bucket =
    file.owner_type === "message" ? "chat-attachments" : "project-files";

  const { data: signed, error: signError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(file.storage_path, 60);

  if (signError || !signed) {
    return NextResponse.json({ error: "Unable to create download link" }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl);
}