"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useState } from "react";
import { Plus } from "lucide-react";
import { createProject } from "@/server/actions/project";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAction } from "@/hooks/use-action";
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS } from "@/lib/constants";

export function NewProjectDialog({
  orgId,
  members,
}: {
  orgId: string;
  members: { id: string; name: string }[];
}) {
  const router = useRouter();
  const { isPending, run } = useAction();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("planning");
  const [ownerId, setOwnerId] = useState("");
  const [aiMonitoring, setAiMonitoring] = useState(true);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const result = await run(() =>
      createProject({
        organization_id: orgId,
        name: String(formData.get("name") ?? ""),
        description: String(formData.get("description") ?? "") || null,
        start_date: String(formData.get("start_date") ?? "") || null,
        end_date: String(formData.get("end_date") ?? "") || null,
        owner_id: ownerId || null,
        status: status as never,
        ai_monitoring_enabled: aiMonitoring,
      })
    );

    if (result.success) {
      toast.success("Project berhasil dibuat");
      setOpen(false);
      router.push(`/orgs/${orgId}/projects/${result.data?.id}/board`);
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="mr-2 h-4 w-4" />
        Project Baru
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Buat Project Baru</DialogTitle>
          <DialogDescription>
            Lengkapi detail project. Kamu bisa mengubahnya nanti.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nama Project</Label>
            <Input id="name" name="name" placeholder="mis. Aplikasi Mobile" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Deskripsi</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Tujuan, scope, catatan..."
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="start_date">Tanggal Mulai</Label>
              <Input id="start_date" name="start_date" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">Tanggal Selesai</Label>
              <Input id="end_date" name="end_date" type="date" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={status}
                items={PROJECT_STATUS_LABELS}
                onValueChange={(v) => setStatus(v ?? "planning")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Project Lead</Label>
              <Select
                value={ownerId}
                items={Object.fromEntries(members.map((m) => [m.id, m.name]))}
                onValueChange={(v) => setOwnerId(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih member" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">AI Monitoring</p>
              <p className="text-xs text-muted-foreground">
                AI memantau task & mengingatkan deadline project ini.
              </p>
            </div>
            <Switch checked={aiMonitoring} onCheckedChange={setAiMonitoring} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Membuat..." : "Buat Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}