"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { resetPassword } from "@/server/actions/auth";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAction } from "@/hooks/use-action";
import { useI18n } from "@/lib/i18n/provider";

export function ResetPasswordForm() {
  const router = useRouter();
  const { isPending, run } = useAction();
  const { t } = useI18n();
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirm = String(formData.get("confirm") ?? "");

    if (password !== confirm) {
      toast.error(t("auth.confirmMismatch"));
      return;
    }

    const result = await run(async () => {
      const res = await resetPassword({ password });
      if (!res.success && res.error?.toLowerCase().includes("session")) {
        // Fallback to client-side auth update if session is in browser hash / storage
        const supabase = createClient();
        const { error } = await supabase.auth.updateUser({ password });
        if (error) return { success: false, error: error.message };
        return { success: true, data: undefined };
      }
      return res;
    });

    if (result.success) {
      toast.success(t("auth.passwordChanged"));
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
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
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">{t("auth.confirmPassword")}</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          minLength={8}
          required
          autoComplete="new-password"
        />
      </div>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? t("common.saving") : t("auth.resetPasswordDone")}
      </Button>
    </form>
  );
}