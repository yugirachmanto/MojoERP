import { z } from "zod";
import { MEMBER_ROLES } from "@/lib/constants";

export type OrgRole = (typeof MEMBER_ROLES)[number]["value"];

export const orgRoleSchema = z.enum(
  MEMBER_ROLES.map((r) => r.value) as unknown as [OrgRole, ...OrgRole[]]
);

export const createOrganizationSchema = z.object({
  name: z.string().trim().optional().default(""),
  timezone: z.string().default("UTC"),
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(2).optional(),
  timezone: z.string().optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email("Email tidak valid"),
  role: orgRoleSchema,
  approval_level: z.number().int().min(1).optional().nullable(),
  department_id: z.string().uuid().optional().nullable(),
});

export const updateMemberSchema = z.object({
  role: orgRoleSchema,
  approval_level: z.number().int().min(1).optional().nullable(),
  department_id: z.string().uuid().optional().nullable(),
});

export const updateRoleOrderSchema = z.object({
  role_order: z.array(orgRoleSchema).min(1),
});

export const departmentSchema = z.object({
  name: z.string().trim().min(1, "Nama department wajib diisi").max(80),
});

export const updateMemberDepartmentSchema = z.object({
  department_id: z.string().uuid().optional().nullable(),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type UpdateRoleOrderInput = z.infer<typeof updateRoleOrderSchema>;
export type DepartmentInput = z.infer<typeof departmentSchema>;
export type UpdateMemberDepartmentInput = z.infer<typeof updateMemberDepartmentSchema>;