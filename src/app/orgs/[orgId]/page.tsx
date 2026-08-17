import { redirect } from "next/navigation";

export default async function OrgIndexPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  redirect(`/orgs/${orgId}/dashboard`);
}