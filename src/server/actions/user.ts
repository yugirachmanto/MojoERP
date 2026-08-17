"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { ActionError, fail, ok, type ActionResult } from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import { LANGUAGES } from "@/lib/i18n";

export async function updateLanguage(
  input: unknown
): Promise<ActionResult> {
  const lang = String(input);
  if (!LANGUAGES.some((l) => l.code === lang)) {
    return fail(new ActionError("Bahasa tidak didukung"));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(new ActionError("Tidak terautentikasi"));

  const { error } = await supabase
    .from("profiles")
    .update({ language: lang })
    .eq("id", user.id);
  if (error) return fail(error);

  const cookieStore = await cookies();
  cookieStore.set("app_language", lang, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath("/", "layout");
  return ok();
}
