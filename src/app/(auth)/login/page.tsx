import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";
import { getServerLanguage } from "@/lib/i18n/server";
import { translate } from "@/lib/i18n";

export const metadata: Metadata = { title: "Masuk" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const lang = await getServerLanguage();
  const t = (key: Parameters<typeof translate>[1]) => translate(lang, key);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{t("auth.loginTitle")}</CardTitle>
        {params.error && (
          <p className="text-sm text-destructive">{t("auth.authError")}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <LoginForm />
        <div className="flex flex-col gap-1 text-center text-sm text-muted-foreground">
          <Link href="/forgot-password" className="hover:text-foreground hover:underline">
            {t("auth.forgotPassword")}
          </Link>
          <p>
            {t("auth.noAccount")}{" "}
            <Link href="/register" className="font-medium text-foreground hover:underline">
              {t("auth.register")}
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}