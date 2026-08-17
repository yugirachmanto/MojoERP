import { z } from "zod";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/constants";

export type TaskStatus = (typeof TASK_STATUSES)[number]["value"];
export type TaskPriority = (typeof TASK_PRIORITIES)[number]["value"];

export const taskStatusSchema = z.enum(
  TASK_STATUSES.map((s) => s.value) as unknown as [TaskStatus, ...TaskStatus[]]
);

export const taskPrioritySchema = z.enum(
  TASK_PRIORITIES.map((p) => p.value) as unknown as [
    TaskPriority,
    ...TaskPriority[]
  ]
);

export const createTaskSchema = z.object({
  project_id: z.string().uuid(),
  title: z.string().min(1, "Judul task wajib diisi"),
  description: z.string().optional().nullable(),
  assignee_id: z.string().uuid().optional().nullable(),
  parent_task_id: z.string().uuid().optional().nullable(),
  start_date: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  priority: taskPrioritySchema.default("medium"),
  status: taskStatusSchema.default("todo"),
  estimated_hours: z.number().nonnegative().optional().nullable(),
  labels: z.array(z.string()).default([]),
  approval_depth: z.number().int().min(0).max(20).default(0),
});

export const updateTaskSchema = createTaskSchema
  .omit({ project_id: true })
  .partial();

export const moveTaskSchema = z.object({
  task_id: z.string().uuid(),
  status: taskStatusSchema,
  sort_order: z.number().int().default(0),
});

export const toggleSubtaskSchema = z.object({
  subtask_id: z.string().uuid(),
  done: z.boolean(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;