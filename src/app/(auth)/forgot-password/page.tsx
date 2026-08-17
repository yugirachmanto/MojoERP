import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { getServerLanguage } from "@/lib/i18n/server";
import { translate } from "@/lib/i18n";

export const metadata: Metadata = { title: "Lupa Password" };

export default async function ForgotPasswordPage() {
  const lang = await getServerLanguage();
  const t = (key: Parameters<typeof translate>[1]) => translate(lang, key);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{t("auth.resetPassword")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ForgotPasswordForm />
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="hover:text-foreground hover:underline">
            {t("auth.backToLogin")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}