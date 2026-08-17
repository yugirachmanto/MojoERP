-- 00010_owner_roles_departments.sql
-- Owner role, customizable role hierarchy (approval chain), departments, task approvals

-- ============================================================
-- 1. Add 'owner' role to organization members (top of hierarchy)
-- ============================================================
alter table public.organization_members
  drop constraint if exists organization_members_role_check;

alter table public.organization_members
  add constraint organization_members_role_check
  check (role in ('owner', 'admin', 'manager', 'member', 'viewer'));

-- ============================================================
-- 2. Role hierarchy (approval chain), read top -> bottom
--    Stored on the organization so each tenant can reorder it.
-- ============================================================
alter table public.organizations
  add column if not exists role_order text[]
    not null default array['owner','admin','manager','member','viewer'];

-- ============================================================
-- 3. Departments (managed per organization)
-- ============================================================
create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create index if not exists departments_org_idx on public.departments(organization_id);

alter table public.organization_members
  add column if not exists department_id uuid
    references public.departments(id) on delete set null;

-- ============================================================
-- 4. Per-task approval depth (0 = no approval needed)
-- ============================================================
alter table public.tasks
  add column if not exists approval_depth int not null default 0
    check (approval_depth between 0 and 20);

-- ============================================================
-- 5. Task approvals (one row per step of the chain)
-- ============================================================
create table if not exists public.task_approvals (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  step_number int not null,
  required_role text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'skipped')),
  approver_id uuid references auth.users(id) on delete set null,
  comment text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  unique (task_id, step_number)
);

create index if not exists task_approvals_task_idx on public.task_approvals(task_id);

-- ============================================================
-- 6. Membership helper: 'owner' behaves as top role
-- ============================================================
create or replace function public.has_org_role(_org uuid, _role text)
returns boolean
language sql stable security definer
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = _org
      and om.user_id = auth.uid()
      and om.status = 'active'
      and case _role
        when 'admin'    then om.role in ('owner', 'admin')
        when 'manager'  then om.role in ('owner', 'admin', 'manager')
        when 'member'   then om.role in ('owner', 'admin', 'manager', 'member')
        when 'viewer'   then om.role in ('owner', 'admin', 'manager', 'member', 'viewer')
        else om.role = _role
      end
  );
$$;

-- ============================================================
-- 7. RLS: departments
-- ============================================================
alter table public.departments enable row level security;

drop policy if exists "departments_select" on public.departments;
create policy "departments_select" on public.departments
  for select using (public.has_org_role(organization_id, 'viewer'));

drop policy if exists "departments_insert" on public.departments;
create policy "departments_insert" on public.departments
  for insert with check (public.has_org_role(organization_id, 'admin'));

drop policy if exists "departments_update" on public.departments;
create policy "departments_update" on public.departments
  for update using (public.has_org_role(organization_id, 'admin'));

drop policy if exists "departments_delete" on public.departments;
create policy "departments_delete" on public.departments
  for delete using (public.has_org_role(organization_id, 'admin'));

-- ============================================================
-- 8. RLS: task approvals
-- ============================================================
alter table public.task_approvals enable row level security;

drop policy if exists "task_approvals_select" on public.task_approvals;
create policy "task_approvals_select" on public.task_approvals
  for select using (
    public.has_org_role(public.project_org((select project_id from public.tasks where id = task_id)), 'member')
  );

drop policy if exists "task_approvals_insert" on public.task_approvals;
create policy "task_approvals_insert" on public.task_approvals
  for insert with check (
    public.has_org_role(public.project_org((select project_id from public.tasks where id = task_id)), 'member')
  );

drop policy if exists "task_approvals_update" on public.task_approvals;
create policy "task_approvals_update" on public.task_approvals
  for update using (
    public.has_org_role(public.project_org((select project_id from public.tasks where id = task_id)), 'member')
  );

drop policy if exists "task_approvals_delete" on public.task_approvals;
create policy "task_approvals_delete" on public.task_approvals
  for delete using (
    public.has_org_role(public.project_org((select project_id from public.tasks where id = task_id)), 'member')
  );