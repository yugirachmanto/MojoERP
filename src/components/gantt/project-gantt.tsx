"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO, differenceInDays, addDays, startOfDay } from "date-fns";
import { ChevronDown, ChevronRight, Calendar, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { updateTask } from "@/server/actions/task";
import { PRIORITY_STYLES, TASK_STATUS_LABELS } from "@/lib/constants";
import type { Tables } from "@/types/database";

type Task = Tables<"tasks"> & { assignee_name?: string | null };

export function ProjectGantt({
  orgId,
  projectId,
  tasks,
}: {
  orgId: string;
  projectId: string;
  tasks: Task[];
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev.id }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    tasks.forEach((t) => {
      all[t.id] = true;
    });
    setExpanded(all);
  };

  const collapseAll = () => {
    setExpanded({});
  };

  // Determine timeline min and max dates
  const taskDates = tasks
    .flatMap((t) => [t.start_date, t.due_date])
    .filter(Boolean)
    .map((d) => parseISO(d!));

  const minDate =
    taskDates.length > 0
      ? new Date(Math.min(...taskDates.map((d) => d.getTime())))
      : startOfDay(new Date());

  const maxDate =
    taskDates.length > 0
      ? new Date(Math.max(...taskDates.map((d) => d.getTime())))
      : addDays(new Date(), 30);

  // Ensure minimum 14 days spread
  const totalDays = Math.max(differenceInDays(maxDate, minDate) + 1, 14);
  const timelineDays = Array.from({ length: totalDays }, (_, i) => addDays(minDate, i));

  async function handleDateChange(taskId: string, field: "start_date" | "due_date", value: string) {
    setUpdatingId(taskId);
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const payload = {
      start_date: field === "start_date" ? value || null : task.start_date,
      due_date: field === "due_date" ? value || null : task.due_date,
    };

    const res = await updateTask(projectId, taskId, payload);
    setUpdatingId(null);
    if (res.success) {
      toast.success("Tanggal task diperbarui");
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  // Group root tasks and subtasks if parent_task_id exists
  const rootTasks = tasks.filter((t) => !t.parent_task_id);
  const subtasksMap = tasks.reduce((acc, t) => {
    if (t.parent_task_id) {
      acc[t.parent_task_id] = acc[t.parent_task_id] ?? [];
      acc[t.parent_task_id].push(t);
    }
    return acc;
  }, {} as Record<string, Task[]>);

  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
        Belum ada task untuk ditampilkan di Gantt Chart.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Rentang: {format(minDate, "dd MMM yyyy")} — {format(maxDate, "dd MMM yyyy")}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={expandAll}>
            Expand All
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            Collapse All
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-background shadow-sm">
        <div className="min-w-[1000px]">
          {/* Timeline Header */}
          <div className="grid grid-cols-12 border-b bg-muted/40 text-xs font-medium text-muted-foreground">
            <div className="col-span-5 p-3">Task & Detail</div>
            <div className="col-span-7 grid" style={{ gridTemplateColumns: `repeat(${timelineDays.length}, minmax(0, 1fr))` }}>
              {timelineDays.map((date, idx) => (
                <div key={idx} className="border-l px-1 py-3 text-center text-[10px]">
                  <div>{format(date, "dd")}</div>
                  <div className="text-[9px] text-muted-foreground/70">{format(date, "MMM")}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Task Rows */}
          {rootTasks.map((task) => {
            const children = subtasksMap[task.id] ?? [];
            const isExpanded = expanded[task.id];
            const hasChildren = children.length > 0;

            return (
              <div key={task.id} className="group border-b last:border-0">
                <TaskRow
                  task={task}
                  hasChildren={hasChildren}
                  isExpanded={isExpanded}
                  onToggle={() => toggleExpand(task.id)}
                  minDate={minDate}
                  totalDays={totalDays}
                  timelineDays={timelineDays}
                  onDateChange={handleDateChange}
                  isUpdating={updatingId === task.id}
                  orgId={orgId}
                  projectId={projectId}
                />
                {hasChildren && isExpanded && (
                  <div className="bg-muted/10">
                    {children.map((child) => (
                      <TaskRow
                        key={child.id}
                        task={child}
                        isChild
                        minDate={minDate}
                        totalDays={totalDays}
                        timelineDays={timelineDays}
                        onDateChange={handleDateChange}
                        isUpdating={updatingId === child.id}
                        orgId={orgId}
                        projectId={projectId}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TaskRow({
  task,
  hasChildren,
  isExpanded,
  onToggle,
  isChild = false,
  minDate,
  totalDays,
  timelineDays,
  onDateChange,
  isUpdating,
  orgId,
  projectId,
}: {
  task: Task;
  hasChildren?: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
  isChild?: boolean;
  minDate: Date;
  totalDays: number;
  timelineDays: Date[];
  onDateChange: (taskId: string, field: "start_date" | "due_date", value: string) => void;
  isUpdating: boolean;
  orgId: string;
  projectId: string;
}) {
  const start = task.start_date ? parseISO(task.start_date) : null;
  const due = task.due_date ? parseISO(task.due_date) : null;

  let leftPct = 0;
  let widthPct = 0;

  if (start && due) {
    const startDiff = differenceInDays(start, minDate);
    const duration = differenceInDays(due, start) + 1;
    leftPct = Math.max(0, (startDiff / totalDays) * 100);
    widthPct = Math.min(100 - leftPct, Math.max((duration / totalDays) * 100, 2));
  } else if (start) {
    const startDiff = differenceInDays(start, minDate);
    leftPct = Math.max(0, (startDiff / totalDays) * 100);
    widthPct = 3;
  }

  return (
    <div className={cn("grid grid-cols-12 items-center hover:bg-muted/30 transition-colors", isChild && "pl-6")}>
      {/* Left Info Pane */}
      <div className="col-span-5 flex items-center gap-2 p-3 text-sm">
        {hasChildren ? (
          <button onClick={onToggle} className="text-muted-foreground hover:text-foreground">
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : (
          <span className="w-4" />
        )}
        <div className="min-w-0 flex-1">
          <a
            href={`/orgs/${orgId}/projects/${projectId}/tasks/${task.id}`}
            className="truncate font-medium hover:underline block"
          >
            {task.title}
          </a>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            <Badge className={cn("text-[10px] px-1.5 py-0", PRIORITY_STYLES[task.priority])}>
              {task.priority}
            </Badge>
            <span>{TASK_STATUS_LABELS[task.status as keyof typeof TASK_STATUS_LABELS] ?? task.status}</span>
          </div>
        </div>

        {/* Quick Date Inputs */}
        <div className="flex items-center gap-1 text-xs">
          <input
            type="date"
            defaultValue={task.start_date ?? ""}
            onBlur={(e) => onDateChange(task.id, "start_date", e.target.value)}
            disabled={isUpdating}
            className="h-7 rounded border bg-background px-1 text-[11px] w-28"
            title="Tanggal Mulai"
          />
          <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
          <input
            type="date"
            defaultValue={task.due_date ?? ""}
            onBlur={(e) => onDateChange(task.id, "due_date", e.target.value)}
            disabled={isUpdating}
            className="h-7 rounded border bg-background px-1 text-[11px] w-28"
            title="Due Date"
          />
        </div>
      </div>

      {/* Right Timeline Bar Pane */}
      <div className="col-span-7 relative h-12 border-l flex items-center px-1">
        <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${timelineDays.length}, minmax(0, 1fr))` }}>
          {timelineDays.map((_, idx) => (
            <div key={idx} className="border-l h-full border-muted/50" />
          ))}
        </div>

        {start && (
          <div
            style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
            className={cn(
              "absolute h-6 rounded-md px-2 flex items-center text-xs font-medium text-white shadow-sm transition-all",
              task.status === "done" ? "bg-emerald-600" : "bg-primary"
            )}
            title={`${task.title}: ${task.start_date} s/d ${task.due_date ?? task.start_date}`}
          >
            <span className="truncate text-[11px]">{task.title}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}