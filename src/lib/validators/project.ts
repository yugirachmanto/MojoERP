import { z } from "zod";
import { PROJECT_STATUSES } from "@/lib/constants";

export type ProjectStatus = (typeof PROJECT_STATUSES)[number]["value"];

export const projectStatusSchema = z.enum(
  PROJECT_STATUSES.map((s) => s.value) as unknown as [
    ProjectStatus,
    ...ProjectStatus[]
  ]
);

export const createProjectSchema = z.object({
  organization_id: z.string().uuid(),
  name: z.string().min(2, "Nama project minimal 2 karakter"),
  description: z.string().optional().nullable(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  owner_id: z.string().uuid().optional().nullable(),
  status: projectStatusSchema.default("planning"),
  ai_monitoring_enabled: z.boolean().default(true),
});

export const updateProjectSchema = createProjectSchema
  .omit({ organization_id: true })
  .partial();

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;