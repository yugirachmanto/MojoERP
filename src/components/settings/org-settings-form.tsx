"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useState } from "react";
import { updateOrganization } from "@/server/actions/org";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAction } from "@/hooks/use-action";

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

export function OrgSettingsForm({
  orgId,
  initialName,
  initialTimezone,
}: {
  orgId: string;
  initialName: string;
  initialTimezone: string;
}) {
  const router = useRouter();
  const { isPending, run } = useAction();
  const [timezone, setTimezone] = useState(initialTimezone);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const result = await run(() =>
      updateOrganization(orgId, {
        name: String(formData.get("name") ?? initialName),
        timezone,
      })
    );
    if (result.success) {
      toast.success("Pengaturan organisasi disimpan");
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nama Organisasi</Label>
        <Input id="name" name="name" defaultValue={initialName} required />
      </div>
      <div className="space-y-2">
        <Label>Zona Waktu</Label>
        <Select
          value={timezone}
          items={Object.fromEntries(TIMEZONES.map((tz) => [tz, tz]))}
          onValueChange={(v) => setTimezone(v ?? "UTC")}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
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
      <Button type="submit" disabled={isPending}>
        {isPending ? "Menyimpan..." : "Simpan perubahan"}
      </Button>
    </form>
  );
}