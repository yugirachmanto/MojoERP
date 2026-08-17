"use client";

import { toast } from "sonner";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createTask } from "@/server/actions/task";
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
import { useAction } from "@/hooks/use-action";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
} from "@/lib/constants";

export function NewTaskDialog({
  projectId,
  members,
  onCreated,
}: {
  projectId: string;
  members: { id: string; name: string }[];
  onCreated?: () => void;
}) {
  const { isPending, run } = useAction();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [priority, setPriority] = useState("medium");
  const [status, setStatus] = useState("todo");
  const [assigneeId, setAssigneeId] = useState("");
  const [approvalDepth, setApprovalDepth] = useState("0");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");

  const showHours = startDate !== "" && dueDate !== "" && startDate === dueDate;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const labels = String(formData.get("labels") ?? "")
      .split(",")
      .map((l) => l.trim())
      .filter(Boolean);

    const result = await run(() =>
      createTask({
        project_id: projectId,
        title: String(formData.get("title") ?? ""),
        description: String(formData.get("description") ?? "") || null,
        assignee_id: assigneeId || null,
        start_date: String(formData.get("start_date") ?? "") || null,
        due_date: String(formData.get("due_date") ?? "") || null,
        priority: priority as never,
        status: status as never,
        approval_depth: Number(approvalDepth),
        estimated_hours: formData.get("estimated_hours")
          ? Number(formData.get("estimated_hours"))
          : null,
        labels,
      })
    );

    if (result.success) {
      toast.success("Task berhasil dibuat");
      setOpen(false);
      onCreated?.();
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="mr-1.5 h-4 w-4" />
        Task Baru
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Buat Task Baru</DialogTitle>
          <DialogDescription>Tambahkan task ke project ini.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Judul Task</Label>
            <Input id="title" name="title" placeholder="mis. Desain halaman login" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Deskripsi</Label>
            <Textarea id="description" name="description" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Assignee</Label>
              <Select
                value={assigneeId}
                items={Object.fromEntries(members.map((m) => [m.id, m.name]))}
                onValueChange={(v) => setAssigneeId(v ?? "")}
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
            {showHours && (
              <div className="space-y-2">
                <Label htmlFor="estimated_hours">Estimasi (jam)</Label>
                <Input
                  id="estimated_hours"
                  name="estimated_hours"
                  type="number"
                  min={0}
                  step={0.5}
                />
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="start_date">Tanggal Mulai</Label>
              <Input
                id="start_date"
                name="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                name="due_date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Prioritas</Label>
              <Select
                value={priority}
                items={TASK_PRIORITY_LABELS}
                onValueChange={(v) => setPriority(v ?? "medium")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={status}
                items={TASK_STATUS_LABELS}
                onValueChange={(v) => setStatus(v ?? "todo")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Level Persetujuan</Label>
            <Select
              value={approvalDepth}
              items={{
                "0": "Tidak ada",
                "1": "1 level (atasan langsung)",
                "2": "2 level",
                "3": "3 level",
              }}
              onValueChange={(v) => setApprovalDepth(v ?? "0")}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Tidak ada</SelectItem>
                <SelectItem value="1">1 level (atasan langsung)</SelectItem>
                <SelectItem value="2">2 level</SelectItem>
                <SelectItem value="3">3 level</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Saat task selesai, perlu berapa banyak persetujuan berjenjang dari
              atasan sesuai hierarki peran.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="labels">Label (pisahkan dengan koma)</Label>
            <Input id="labels" name="labels" placeholder="desain, frontend" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Membuat..." : "Buat Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}