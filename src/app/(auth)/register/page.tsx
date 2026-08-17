import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RegisterForm } from "@/components/auth/register-form";
import { getServerLanguage } from "@/lib/i18n/server";
import { translate } from "@/lib/i18n";

export const metadata: Metadata = { title: "Daftar" };

export default async function RegisterPage() {
  const lang = await getServerLanguage();
  const t = (key: Parameters<typeof translate>[1]) => translate(lang, key);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{t("auth.registerTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <RegisterForm />
        <p className="text-center text-sm text-muted-foreground">
          {t("auth.haveAccount")}{" "}
          <Link href="/login" className="font-medium text-foreground hover:underline">
            {t("auth.login")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}