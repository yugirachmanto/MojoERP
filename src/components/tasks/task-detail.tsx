"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ClipboardCheck,
  Clock,
  ListChecks,
  MessageSquare,
  Pencil,
  Plus,
  Send,
  Trash2,
  User as UserIcon,
  XCircle,
  Paperclip,
  Download,
  Upload,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ChatPanel } from "@/components/chat/chat-panel";
import { useAction } from "@/hooks/use-action";
import { uploadFile, deleteFile } from "@/server/actions/files";
import {
  addSubtask,
  decideApproval,
  deleteTask,
  submitTaskForApproval,
  toggleSubtask,
  updateTask,
} from "@/server/actions/task";
import {
  MEMBER_ROLE_LABELS,
  PRIORITY_STYLES,
  STATUS_STYLES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
} from "@/lib/constants";
import { formatDate, formatDateTime, isOverdue } from "@/lib/utils";
import type { Tables } from "@/types/database";

type Task = Tables<"tasks"> & { assignee_name?: string | null };
type Activity = Tables<"task_activity_log"> & { actor_name?: string | null };
type Message = Tables<"chat_messages"> & { sender_name?: string };
type Approval = Tables<"task_approvals">;

export function TaskDetail({
  orgId,
  projectId,
  task,
  subtasks,
  activity,
  members,
  currentUserId,
  currentRole,
  roleOrder,
  approvals,
  roomId,
  messages,
  files = [],
}: {
  orgId: string;
  projectId: string;
  task: Task;
  subtasks: Tables<"subtasks">[];
  activity: Activity[];
  members: { id: string; name: string }[];
  currentUserId: string;
  currentRole: string;
  roleOrder: string[];
  approvals: Approval[];
  roomId: string | null;
  messages: Message[];
  files?: (Tables<"files"> & { uploader_name?: string | null })[];
}) {
  const router = useRouter();
  const { run } = useAction();
  const [newSubtask, setNewSubtask] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    setUploadingFile(true);
    const formData = new FormData();
    formData.append("file", fileList[0]);
    const res = await uploadFile(orgId, projectId, formData, task.id);
    setUploadingFile(false);
    if (res.success) {
      toast.success("File berhasil diunggah");
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  async function handleDeleteFile(fileId: string) {
    const res = await deleteFile(orgId, fileId);
    if (res.success) {
      toast.success("File dihapus");
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  const doneSubtasks = subtasks.filter((s) => s.done).length;
  const subtaskPct =
    subtasks.length > 0 ? Math.round((doneSubtasks / subtasks.length) * 100) : 0;

  async function handleDelete() {
    const result = await run(() => deleteTask(projectId, task.id));
    if (result.success) {
      toast.success("Task dihapus");
      router.push(`/orgs/${orgId}/projects/${projectId}/board`);
    }
  }

  async function handleAddSubtask(e: React.FormEvent) {
    e.preventDefault();
    const result = await run(() => addSubtask(projectId, task.id, newSubtask));
    if (result.success) {
      setNewSubtask("");
      router.refresh();
    }
  }

  async function handleToggleSubtask(id: string, done: boolean) {
    await run(() => toggleSubtask({ subtask_id: id, done: !done }));
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-6 lg:col-span-3">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link
              href={`/orgs/${orgId}/projects/${projectId}/board`}
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
              Kembali ke board
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={STATUS_STYLES[task.status]}>
              {task.status.replace("_", " ")}
            </Badge>
            <Badge className={PRIORITY_STYLES[task.priority]}>{task.priority}</Badge>
            {task.labels.map((l) => (
              <Badge key={l} variant="outline">
                {l}
              </Badge>
            ))}
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">{task.title}</h2>
          {task.description && (
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {task.description}
            </p>
          )}
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <UserIcon className="h-4 w-4" />
              {task.assignee_name ?? "Belum di-assign"}
            </span>
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" />
              {formatDate(task.start_date)} —{" "}
              <span className={isOverdue(task.due_date) && !task.completed_at ? "font-medium text-destructive" : ""}>
                {task.due_date ? formatDate(task.due_date) : "tanpa deadline"}
              </span>
            </span>
            {task.estimated_hours != null && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {task.estimated_hours} jam
              </span>
            )}
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <ListChecks className="h-4 w-4" />
              Checklist
            </CardTitle>
            <div className="flex items-center gap-2">
              {subtasks.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {doneSubtasks}/{subtasks.length}
                </span>
              )}
              <EditTaskDialog
                projectId={projectId}
                task={task}
                members={members}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                title="Hapus task"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {subtasks.length > 0 && (
              <Progress value={subtaskPct} className="mb-1" />
            )}
            {subtasks.map((s) => (
              <label
                key={s.id}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg border p-2.5 transition-colors hover:bg-muted/40"
              >
                <button
                  type="button"
                  onClick={() => handleToggleSubtask(s.id, s.done)}
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                    s.done ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30"
                  }`}
                >
                  {s.done && <Check className="h-3 w-3" />}
                </button>
                <span className={s.done ? "text-muted-foreground line-through" : "text-sm"}>
                  {s.title}
                </span>
              </label>
            ))}
            <form onSubmit={handleAddSubtask} className="flex items-center gap-2">
              <Input
                placeholder="Tambahkan subtask..."
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
              />
              <Button type="submit" size="icon" disabled={!newSubtask.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Paperclip className="h-4 w-4" />
              Lampiran File & Gambar ({files.length})
            </CardTitle>
            <div>
              <Button
                size="sm"
                variant="outline"
                disabled={uploadingFile}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                {uploadingFile ? "Mengunggah..." : "Unggah File"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {files.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                Belum ada lampiran file atau gambar pada task ini.
              </p>
            ) : (
              files.map((file) => {
                const isImage = file.mime_type?.startsWith("image/");
                return (
                  <div key={file.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {isImage ? (
                        <a href={`/api/files/${file.id}/download`} target="_blank" rel="noreferrer">
                          <img
                            src={`/api/files/${file.id}/download`}
                            alt={file.file_name}
                            className="h-10 w-10 rounded object-cover border"
                          />
                        </a>
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{file.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {file.uploader_name ?? "—"} • {file.size_bytes ? `${Math.round(file.size_bytes / 1024)} KB` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        render={<a href={`/api/files/${file.id}/download`} target="_blank" rel="noreferrer" />}
                        title="Unduh"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteFile(file.id)}
                        title="Hapus"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <ApprovalCard
          projectId={projectId}
          task={task}
          currentRole={currentRole}
          roleOrder={roleOrder}
          approvals={approvals}
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity Log</CardTitle>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada aktivitas.</p>
            ) : (
              <ul className="space-y-2.5">
                {activity.map((a) => (
                  <li key={a.id} className="flex items-start gap-2 text-sm">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
                    <div>
                      <span className="font-medium">
                        {a.actor_name ?? "System"}
                      </span>{" "}
                      <span className="text-muted-foreground">{a.action}</span>
                      {a.field && (
                        <span className="text-muted-foreground">
                          {" "}
                          pada {a.field.replace("_", " ")}
                        </span>
                      )}
                      <span className="ml-1 text-xs text-muted-foreground">
                        {formatDateTime(a.created_at)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2">
        <div className="mb-3 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-medium">Thread Task</p>
        </div>
        {roomId ? (
          <div className="h-[calc(100vh-15rem)]">
            <ChatPanel roomId={roomId} messages={messages} currentUserId={currentUserId} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Thread tidak tersedia.</p>
        )}
      </div>
    </div>
  );
}

function ApprovalCard({
  projectId,
  task,
  currentRole,
  roleOrder,
  approvals,
}: {
  projectId: string;
  task: Task;
  currentRole: string;
  roleOrder: string[];
  approvals: Approval[];
}) {
  const router = useRouter();
  const { isPending, run } = useAction();
  const [comment, setComment] = useState("");

  const depth = task.approval_depth ?? 0;
  const sorted = [...approvals].sort((a, b) => a.step_number - b.step_number);
  const firstPending = sorted.find((s) => s.status === "pending");
  const currentRank = roleOrder.indexOf(currentRole);
  const canAct =
    task.status === "review" &&
    !!firstPending &&
    currentRank >= 0 &&
    currentRank <= roleOrder.indexOf(firstPending.required_role);

  async function handleSubmit() {
    const result = await run(() => submitTaskForApproval(projectId, task.id));
    if (result.success) {
      toast.success("Task dikirim untuk persetujuan");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  async function handleDecide(id: string, decision: "approve" | "reject") {
    const result = await run(() =>
      decideApproval(projectId, task.id, id, decision, comment)
    );
    if (result.success) {
      toast.success(decision === "approve" ? "Disetujui" : "Ditolak");
      setComment("");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardCheck className="h-4 w-4" />
          Persetujuan
        </CardTitle>
        {task.status !== "review" && depth > 0 && (
          <Button size="sm" onClick={handleSubmit} disabled={isPending}>
            <Send className="mr-1.5 h-4 w-4" />
            Kirim untuk Persetujuan
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {depth === 0 ? (
          <p className="text-sm text-muted-foreground">
            Task ini tidak memerlukan persetujuan.
          </p>
        ) : sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Belum ada pengajuan. Gunakan tombol {"\u201c"}Kirim untuk Persetujuan{"\u201d"}.
          </p>
        ) : (
          <>
            <ol className="space-y-2">
              {sorted.map((s) => {
                const statusStyle =
                  s.status === "approved"
                    ? "bg-emerald-100 text-emerald-700"
                    : s.status === "rejected"
                      ? "bg-red-100 text-red-700"
                      : "bg-slate-100 text-slate-600";
                return (
                  <li
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {MEMBER_ROLE_LABELS[s.required_role] ?? s.required_role}
                      </p>
                      {s.comment && (
                        <p className="text-xs text-muted-foreground">{s.comment}</p>
                      )}
                    </div>
                    <Badge className={statusStyle}>
                      {s.status === "approved"
                        ? "Disetujui"
                        : s.status === "rejected"
                          ? "Ditolak"
                          : "Menunggu"}
                    </Badge>
                  </li>
                );
              })}
            </ol>
            {canAct && firstPending && (
              <div className="space-y-2 pt-2">
                <Input
                  placeholder="Catatan (opsional)"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    disabled={isPending}
                    onClick={() => handleDecide(firstPending.id, "approve")}
                  >
                    <Check className="mr-1.5 h-4 w-4" />
                    Setujui
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1"
                    disabled={isPending}
                    onClick={() => handleDecide(firstPending.id, "reject")}
                  >
                    <XCircle className="mr-1.5 h-4 w-4" />
                    Tolak
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function EditTaskDialog({
  projectId,
  task,
  members,
}: {
  projectId: string;
  task: Task;
  members: { id: string; name: string }[];
}) {
  const router = useRouter();
  const { isPending, run } = useAction();
  const [open, setOpen] = useState(false);
  const [priority, setPriority] = useState(task.priority);
  const [assigneeId, setAssigneeId] = useState(task.assignee_id ?? "");
  const [startDate, setStartDate] = useState(task.start_date ?? "");
  const [dueDate, setDueDate] = useState(task.due_date ?? "");

  const showHours = startDate !== "" && dueDate !== "" && startDate === dueDate;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const labels = String(formData.get("labels") ?? "")
      .split(",")
      .map((l) => l.trim())
      .filter(Boolean);

    const result = await run(() =>
      updateTask(projectId, task.id, {
        title: String(formData.get("title") ?? task.title),
        description: String(formData.get("description") ?? "") || null,
        assignee_id: assigneeId || null,
        start_date: String(formData.get("start_date") ?? "") || null,
        due_date: String(formData.get("due_date") ?? "") || null,
        priority: priority as never,
        estimated_hours: formData.get("estimated_hours")
          ? Number(formData.get("estimated_hours"))
          : null,
        labels,
      })
    );
    if (result.success) {
      toast.success("Task diperbarui");
      setOpen(false);
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="ghost" size="icon" title="Edit task" />}
      >
        <Pencil className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Judul</label>
            <Input name="title" defaultValue={task.title} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Deskripsi</label>
            <Textarea name="description" defaultValue={task.description ?? ""} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Assignee</label>
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
            <div className="space-y-2">
              <label className="text-sm font-medium">Prioritas</label>
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
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tanggal Mulai</label>
              <Input
                name="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Due Date</label>
              <Input
                name="due_date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {showHours ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">Estimasi (jam)</label>
                <Input
                  name="estimated_hours"
                  type="number"
                  min={0}
                  step={0.5}
                  defaultValue={task.estimated_hours ?? ""}
                />
              </div>
            ) : null}
            <div className="space-y-2">
              <label className="text-sm font-medium">Label</label>
              <Input name="labels" defaultValue={task.labels.join(", ")} />
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Ubah status</p>
              <Select
                defaultValue={task.status}
                items={TASK_STATUS_LABELS}
                onValueChange={(v) => handleQuickStatus(v ?? task.status)}
              >
                <SelectTrigger className="w-44">
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
            <Button type="submit" disabled={isPending}>
              {isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );

  async function handleQuickStatus(status: string) {
    const result = await run(() =>
      updateTask(projectId, task.id, { status: status as never })
    );
    if (result.success) {
      toast.success("Status diubah");
      router.refresh();
    }
  }
}

export function TaskStatusSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} items={TASK_STATUS_LABELS} onValueChange={(v) => onChange(v ?? "")}>
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
  );
}