"use client";

import { useState } from "react";
import { toast } from "sonner";
import { forgotPassword } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAction } from "@/hooks/use-action";
import { useI18n } from "@/lib/i18n/provider";

export function ForgotPasswordForm() {
  const { isPending, run } = useAction();
  const { t } = useI18n();
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const result = await run(() =>
      forgotPassword({ email: String(formData.get("email") ?? "") })
    );
    if (result.success) {
      setSent(true);
      toast.success(t("auth.resetLinkSent"));
    }
  }

  if (sent) {
    return (
      <div className="rounded-lg border bg-muted/50 p-4 text-center text-sm">
        {t("auth.resetLinkSentBody")}
      </div>
    );
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
        />
      </div>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? t("common.loading") : t("auth.sendResetLink")}
      </Button>
    </form>
  );
}