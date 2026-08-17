"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useState } from "react";
import { createOrganization } from "@/server/actions/org";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAction } from "@/hooks/use-action";
import { useI18n } from "@/lib/i18n/provider";

const TIMEZONES = [
  "Asia/Jakarta",
  "Asia/Makassar",
  "Asia/Pontianak",
  "Asia/Jayapura",
  "Asia/Singapore",
  "UTC",
  "America/New_York",
  "Europe/London",
];

export function OnboardingForm() {
  const router = useRouter();
  const { isPending, run } = useAction();
  const { t } = useI18n();
  const [timezone, setTimezone] = useState("Asia/Jakarta");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const result = await run(() =>
      createOrganization({
        name: String(formData.get("name") ?? ""),
        timezone,
      })
    );

    if (result.success) {
      toast.success(t("onboarding.orgCreated"));
      router.push(`/orgs/${result.data?.organization_id}/dashboard`);
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="name">
          {t("onboarding.companyName")}{" "}
          <span className="font-normal text-muted-foreground">
            ({t("common.optional")})
          </span>
        </Label>
        <Input
          id="name"
          name="name"
          placeholder="mis. PT Maju Bersama"
        />
        <p className="text-xs text-muted-foreground">
          {t("onboarding.companyNameHelp")}
        </p>
      </div>
      <div className="space-y-2">
        <Label>{t("onboarding.timezone")}</Label>
        <Select
          value={timezone}
          items={Object.fromEntries(TIMEZONES.map((tz) => [tz, tz]))}
          onValueChange={(v) => setTimezone(v ?? "Asia/Jakarta")}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Pilih zona waktu" />
          </SelectTrigger>
          <SelectContent>
            {TIMEZONES.map((tz) => (
              <SelectItem key={tz} value={tz}>
                {tz}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? t("onboarding.creating") : t("onboarding.createOrg")}
      </Button>
    </form>
  );
}