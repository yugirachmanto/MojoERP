"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { register } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAction } from "@/hooks/use-action";
import { useI18n } from "@/lib/i18n/provider";

export function RegisterForm() {
  const router = useRouter();
  const { isPending, run } = useAction();
  const { t } = useI18n();
  const [requiresConfirmation, setRequiresConfirmation] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const result = await run(() =>
      register({
        name: String(formData.get("name") ?? ""),
        email: String(formData.get("email") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        password: String(formData.get("password") ?? ""),
      })
    );

    if (result.success) {
      const data = result.data as unknown as
        | { requiresConfirmation?: boolean }
        | undefined;
      if (data?.requiresConfirmation) {
        setRequiresConfirmation(true);
        toast.success(t("auth.checkEmail"));
      } else {
        toast.success(t("auth.accountCreated"));
        router.push("/onboarding");
        router.refresh();
      }
    }
  }

  if (requiresConfirmation) {
    return (
      <div className="rounded-lg border bg-muted/50 p-4 text-center text-sm">
        {t("auth.checkEmailBody")} {t("auth.verifyThenLogin")}{" "}
        <a href="/login" className="font-medium underline">
          {t("auth.login")}
        </a>
        .
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">{t("auth.name")}</Label>
        <Input
          id="name"
          name="name"
          placeholder={t("auth.namePlaceholder")}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">{t("auth.email")}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="nama@perusahaan.com"
          required
          autoComplete="email"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">{t("auth.phone")}</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          placeholder={t("auth.phonePlaceholder")}
          required
          autoComplete="tel"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{t("auth.password")}</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            minLength={8}
            required
            autoComplete="new-password"
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={
              showPassword ? t("auth.hidePassword") : t("auth.showPassword")
            }
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">{t("auth.passwordMin")}</p>
      </div>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? t("auth.creatingAccount") : t("auth.register")}
      </Button>
    </form>
  );
}