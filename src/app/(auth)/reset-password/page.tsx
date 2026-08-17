import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { getServerLanguage } from "@/lib/i18n/server";
import { translate } from "@/lib/i18n";

export const metadata: Metadata = { title: "Reset Password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  if (code) {
    redirect(`/auth/callback?code=${encodeURIComponent(code)}&next=/reset-password`);
  }

  const lang = await getServerLanguage();
  const t = (key: Parameters<typeof translate>[1]) => translate(lang, key);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{t("auth.resetPasswordTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResetPasswordForm />
      </CardContent>
    </Card>
  );
}