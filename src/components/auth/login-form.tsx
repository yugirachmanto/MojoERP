"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { login } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAction } from "@/hooks/use-action";
import { useI18n } from "@/lib/i18n/provider";

export function LoginForm() {
  const router = useRouter();
  const { isPending, run } = useAction();
  const { t } = useI18n();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const result = await run(() =>
      login({
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
      })
    );
    if (result.success) {
      toast.success(t("auth.welcomeBack"));
      router.push("/");
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
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
        <Label htmlFor="password">{t("auth.password")}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </div>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? t("common.loading") : t("auth.login")}
      </Button>
    </form>
  );
}