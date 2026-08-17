-- 00001_init.sql
-- Core schema for AI-Powered Project Management Platform (Fase 1)

-- ============================================================
-- Extensions
-- ============================================================
create extension if not exists "pgcrypto";

-- ============================================================
-- Organizations (tenant)
-- ============================================================
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  timezone text not null default 'UTC',
  approval_flow_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- Organization members
-- ============================================================
create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'manager', 'member', 'viewer')),
  approval_level int check (approval_level is null or approval_level >= 1),
  status text not null default 'active' check (status in ('invited', 'active', 'removed')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index organization_members_org_idx on public.organization_members(organization_id);
create index organization_members_user_idx on public.organization_members(user_id);

-- ============================================================
-- Projects
-- ============================================================
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  start_date date,
  end_date date,
  owner_id uuid references auth.users(id) on delete set null,
  status text not null default 'planning'
    check (status in ('planning', 'active', 'on_hold', 'completed', 'cancelled')),
  approval_flow_id uuid,
  ai_monitoring_enabled boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_org_idx on public.projects(organization_id);

-- ============================================================
-- Tasks
-- ============================================================
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  parent_task_id uuid references public.tasks(id) on delete cascade,
  title text not null,
  description text,
  assignee_id uuid references auth.users(id) on delete set null,
  start_date date,
  due_date date,
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high', 'urgent')),
  status text not null default 'todo'
    check (status in ('todo', 'in_progress', 'review', 'done', 'blocked')),
  progress int not null default 0 check (progress between 0 and 100),
  estimated_hours numeric,
  labels text[] not null default '{}',
  sort_order int not null default 0,
  completed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_project_idx on public.tasks(project_id);
create index tasks_assignee_idx on public.tasks(assignee_id);
create index tasks_status_idx on public.tasks(status);

-- ============================================================
-- Task dependencies
-- ============================================================
create table public.task_dependencies (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  depends_on_task_id uuid not null references public.tasks(id) on delete cascade,
  type text not null default 'finish_to_start'
    check (type in ('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish')),
  created_at timestamptz not null default now(),
  unique (task_id, depends_on_task_id)
);

-- ============================================================
-- Subtasks / checklist
-- ============================================================
create table public.subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  title text not null,
  done boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index subtasks_task_idx on public.subtasks(task_id);

-- ============================================================
-- Task activity log
-- ============================================================
create table public.task_activity_log (
  id bigserial primary key,
  task_id uuid not null references public.tasks(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  field text,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create index task_activity_task_idx on public.task_activity_log(task_id);

-- ============================================================
-- Chat rooms & messages
-- ============================================================
create table public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  name text,
  created_at timestamptz not null default now()
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  sender_type text not null default 'user' check (sender_type in ('user', 'ai', 'system')),
  content text not null,
  reply_to_id uuid references public.chat_messages(id) on delete set null,
  attachments uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create index chat_messages_room_idx on public.chat_messages(room_id);
create index chat_rooms_project_idx on public.chat_rooms(project_id);

-- ============================================================
-- Files
-- ============================================================
create table public.files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  message_id uuid references public.chat_messages(id) on delete set null,
  owner_type text not null check (owner_type in ('project', 'task', 'message', 'esign')),
  storage_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid references auth.users(id) on delete set null,
  content_hash text,
  locked boolean not null default false,
  created_at timestamptz not null default now()
);

create index files_org_idx on public.files(organization_id);
create index files_project_idx on public.files(project_id);
create index files_task_idx on public.files(task_id);

-- ============================================================
-- Approval flows
-- ============================================================
create table public.approval_flows (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  is_default boolean not null default false,
  requires_signature boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.approval_steps (
  id uuid primary key default gen_random_uuid(),
  flow_id uuid not null references public.approval_flows(id) on delete cascade,
  step_number int not null,
  required_role text not null check (required_role in ('project_lead', 'manager', 'director')),
  required_level int,
  unique (flow_id, step_number)
);

create index approval_steps_flow_idx on public.approval_steps(flow_id);

alter table public.organizations
  add constraint organizations_approval_flow_fk
  foreign key (approval_flow_id) references public.approval_flows(id) on delete set null;

alter table public.projects
  add constraint projects_approval_flow_fk
  foreign key (approval_flow_id) references public.approval_flows(id) on delete set null;

-- ============================================================
-- AI settings (BYO API key, encrypted at rest app-side)
-- ============================================================
create table public.ai_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null check (provider in ('anthropic', 'openai')),
  encrypted_api_key text not null,
  key_last4 text not null,
  model text not null default 'claude-sonnet',
  temperature numeric not null default 0.3,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider)
);

-- ============================================================
-- Notifications
-- ============================================================
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in (
    'task_assigned', 'deadline_soon', 'mention', 'approval_pending',
    'approval_result', 'ai_report', 'ai_reminder', 'system'
  )),
  title text not null,
  body text,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications(user_id);

-- ============================================================
-- Audit log
-- ============================================================
create table public.audit_logs (
  id bigserial primary key,
  organization_id uuid,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  before jsonb,
  after jsonb,
  ip_address text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_org_idx on public.audit_logs(organization_id);
create index audit_logs_actor_idx on public.audit_logs(actor_id);