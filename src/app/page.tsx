import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMemberships } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const memberships = await getMemberships(user.id);
  if (memberships.length === 0) redirect("/onboarding");

  redirect(`/orgs/${memberships[0].organizations?.id ?? memberships[0].organization_id}/dashboard`);
}