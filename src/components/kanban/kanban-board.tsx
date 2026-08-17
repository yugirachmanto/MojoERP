"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useDroppable,
  useDraggable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { moveTask } from "@/server/actions/task";
import { TASK_STATUSES, PRIORITY_STYLES } from "@/lib/constants";
import { cn, formatDate, isOverdue } from "@/lib/utils";
import type { Tables } from "@/types/database";

type Task = Tables<"tasks"> & { assignee_name?: string | null };

const COLUMN_HEADERS = Object.fromEntries(
  TASK_STATUSES.map((s) => [s.value, s.label])
);

function Column({
  status,
  tasks,
  orgId,
  projectId,
}: {
  status: string;
  tasks: Task[];
  orgId: string;
  projectId: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-64 shrink-0 flex-col rounded-xl border bg-muted/30 transition-colors",
        isOver && "border-primary bg-primary/5"
      )}
    >
      <div className="flex items-center justify-between px-3 py-2.5">
        <p className="text-sm font-medium">
          {COLUMN_HEADERS[status] ?? status}
        </p>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {tasks.length}
        </span>
      </div>
      <div className="flex flex-col gap-2 px-2 pb-2">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            orgId={orgId}
            projectId={projectId}
          />
        ))}
        {tasks.length === 0 && (
          <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
            Tidak ada task
          </div>
        )}
      </div>
    </div>
  );
}

function TaskCard({
  task,
  orgId,
  projectId,
}: {
  task: Task;
  orgId: string;
  projectId: string;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
  });

  return (
    <Link
      ref={setNodeRef}
      href={`/orgs/${orgId}/projects/${projectId}/tasks/${task.id}`}
      {...attributes}
      {...listeners}
      className={cn(
        "block cursor-grab rounded-lg border bg-background p-3 shadow-sm transition-shadow hover:shadow active:cursor-grabbing",
        isDragging && "opacity-40"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug">{task.title}</p>
        <Badge className={PRIORITY_STYLES[task.priority]}>{task.priority}</Badge>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span
          className={cn(
            "flex items-center gap-1",
            isOverdue(task.due_date) && !task.completed_at &&
              "font-medium text-destructive"
          )}
        >
          <CalendarDays className="h-3 w-3" />
          {task.due_date ? formatDate(task.due_date) : "—"}
        </span>
        {task.assignee_name && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
            {task.assignee_name
              .split(" ")
              .map((s) => s[0])
              .slice(0, 2)
              .join("")}
          </span>
        )}
      </div>
    </Link>
  );
}

function groupTasks(tasks: Task[], columns: string[]): Record<string, Task[]> {
  const grouped: Record<string, Task[]> = {};
  for (const col of columns) grouped[col] = [];
  for (const task of tasks) {
    grouped[task.status] = grouped[task.status] ?? [];
    grouped[task.status].push(task);
  }
  return grouped;
}

export function KanbanBoard({
  orgId,
  projectId,
  tasks,
  columns,
}: {
  orgId: string;
  projectId: string;
  tasks: Task[];
  columns: string[];
}) {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [items, setItems] = useState<Record<string, Task[]>>(() =>
    groupTasks(tasks, columns)
  );
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [prevTasks, setPrevTasks] = useState(tasks);
  if (tasks !== prevTasks) {
    setPrevTasks(tasks);
    setItems(groupTasks(tasks, columns));
  }

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`board:${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `project_id=eq.${projectId}`,
        },
        () => router.refresh()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, router]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const activeTask = activeId
    ? Object.values(items).flat().find((t) => t.id === activeId) ?? null
    : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const task = Object.values(items).flat().find((t) => t.id === active.id);
    const toStatus = String(over.id);
    if (!task || !columns.includes(toStatus) || task.status === toStatus) return;

    const previous = items;
    setItems((prev) => {
      const next: Record<string, Task[]> = {};
      for (const col of columns) {
        next[col] = (prev[col] ?? []).filter((t) => t.id !== task.id);
      }
      next[toStatus] = [
        ...(next[toStatus] ?? []),
        { ...task, status: toStatus as Task["status"] },
      ];
      return next;
    });

    const result = await moveTask({ task_id: task.id, status: toStatus });
    if (!result.success) {
      setItems(previous);
      toast.error(result.error);
    } else {
      router.refresh();
    }
  }

  if (!isMounted) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((status) => (
          <div key={status} className="flex w-64 shrink-0 flex-col rounded-xl border bg-muted/30 p-3">
            <div className="flex items-center justify-between py-2.5">
              <p className="text-sm font-medium">{COLUMN_HEADERS[status] ?? status}</p>
            </div>
            <div className="space-y-2">
              {(items[status] ?? []).map((task) => (
                <div key={task.id} className="rounded-lg border bg-background p-3 shadow-sm">
                  <p className="text-sm font-medium">{task.title}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((status) => (
          <Column
            key={status}
            status={status}
            tasks={items[status] ?? []}
            orgId={orgId}
            projectId={projectId}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? (
          <div className="w-64 rounded-lg border bg-background p-3 shadow-lg">
            <p className="text-sm font-medium">{activeTask.title}</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}