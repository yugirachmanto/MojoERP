"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PRIORITY_STYLES,
  STATUS_STYLES,
  TASK_STATUSES,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
} from "@/lib/constants";
import { formatDate, isOverdue } from "@/lib/utils";
import type { Tables } from "@/types/database";

type Task = Tables<"tasks"> & { assignee_name?: string | null };

export function TaskListView({
  orgId,
  projectId,
  tasks,
}: {
  orgId: string;
  projectId: string;
  tasks: Task[];
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      const q = query.toLowerCase();
      const matchQuery =
        !q ||
        t.title.toLowerCase().includes(q) ||
        (t.assignee_name?.toLowerCase().includes(q) ?? false) ||
        t.labels.some((l) => l.toLowerCase().includes(q));
      const matchStatus = statusFilter === "all" || t.status === statusFilter;
      const matchPriority =
        priorityFilter === "all" || t.priority === priorityFilter;
      return matchQuery && matchStatus && matchPriority;
    });
  }, [tasks, query, statusFilter, priorityFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari task..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-56 pl-8"
          />
        </div>
        <Select
          value={statusFilter}
          items={{ all: "Semua status", ...TASK_STATUS_LABELS }}
          onValueChange={(v) => setStatusFilter(v ?? "all")}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua status</SelectItem>
            {TASK_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={priorityFilter}
          items={{ all: "Semua prioritas", ...TASK_PRIORITY_LABELS }}
          onValueChange={(v) => setPriorityFilter(v ?? "all")}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Prioritas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua prioritas</SelectItem>
            {["low", "medium", "high", "urgent"].map((p) => (
              <SelectItem key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Prioritas</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Labels</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  Tidak ada task yang cocok.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>
                    <Link
                      href={`/orgs/${orgId}/projects/${projectId}/tasks/${task.id}`}
                      className="font-medium hover:text-primary hover:underline"
                    >
                      {task.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUS_STYLES[task.status]}>
                      {task.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={PRIORITY_STYLES[task.priority]}>
                      {task.priority}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {task.assignee_name ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    <span
                      className={`inline-flex items-center gap-1 ${
                        isOverdue(task.due_date) && !task.completed_at
                          ? "font-medium text-destructive"
                          : "text-muted-foreground"
                      }`}
                    >
                      <CalendarDays className="h-3 w-3" />
                      {task.due_date ? formatDate(task.due_date) : "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {task.labels.map((label) => (
                        <Badge key={label} variant="outline">
                          {label}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}