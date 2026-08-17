import { createClient } from "@/lib/supabase/server";
import { DEFAULT_LANGUAGE, type Language } from "@/lib/i18n";
import { cookies } from "next/headers";

export async function getServerLanguage(): Promise<Language> {
  try {
    const cookieStore = await cookies();
    const cookieLang = cookieStore.get("app_language")?.value;
    if (cookieLang === "id" || cookieLang === "en") {
      return cookieLang;
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return DEFAULT_LANGUAGE;
    const { data } = await supabase
      .from("profiles")
      .select("language")
      .eq("id", user.id)
      .single();
    const lang = data?.language as Language | undefined;
    return lang === "id" || lang === "en" ? lang : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}
