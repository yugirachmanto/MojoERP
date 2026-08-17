-- 00003_rls.sql
-- Row Level Security policies (multi-tenant isolation)

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.task_dependencies enable row level security;
alter table public.subtasks enable row level security;
alter table public.task_activity_log enable row level security;
alter table public.chat_rooms enable row level security;
alter table public.chat_messages enable row level security;
alter table public.files enable row level security;
alter table public.approval_flows enable row level security;
alter table public.approval_steps enable row level security;
alter table public.ai_settings enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

-- ============================================================
-- organizations
-- ============================================================
drop policy if exists "org_select" on public.organizations;
create policy "org_select" on public.organizations
  for select using (public.is_org_member(id));

drop policy if exists "org_insert" on public.organizations;
create policy "org_insert" on public.organizations
  for insert with check (auth.uid() is not null);

drop policy if exists "org_update" on public.organizations;
create policy "org_update" on public.organizations
  for update using (public.has_org_role(id, 'admin'));

drop policy if exists "org_delete" on public.organizations;
create policy "org_delete" on public.organizations
  for delete using (public.has_org_role(id, 'admin'));

-- ============================================================
-- organization_members
-- ============================================================
drop policy if exists "members_select" on public.organization_members;
create policy "members_select" on public.organization_members
  for select using (public.is_org_member(organization_id));

drop policy if exists "members_insert" on public.organization_members;
create policy "members_insert" on public.organization_members
  for insert with check (public.has_org_role(organization_id, 'admin'));

drop policy if exists "members_update" on public.organization_members;
create policy "members_update" on public.organization_members
  for update using (public.has_org_role(organization_id, 'admin'));

drop policy if exists "members_delete" on public.organization_members;
create policy "members_delete" on public.organization_members
  for delete using (public.has_org_role(organization_id, 'admin'));

-- ============================================================
-- projects
-- ============================================================
drop policy if exists "projects_select" on public.projects;
create policy "projects_select" on public.projects
  for select using (public.is_org_member(organization_id));

drop policy if exists "projects_insert" on public.projects;
create policy "projects_insert" on public.projects
  for insert with check (public.has_org_role(organization_id, 'member'));

drop policy if exists "projects_update" on public.projects;
create policy "projects_update" on public.projects
  for update using (
    public.has_org_role(organization_id, 'member')
    or owner_id = auth.uid()
  );

drop policy if exists "projects_delete" on public.projects;
create policy "projects_delete" on public.projects
  for delete using (public.has_org_role(organization_id, 'admin'));

-- ============================================================
-- tasks
-- ============================================================
drop policy if exists "tasks_select" on public.tasks;
create policy "tasks_select" on public.tasks
  for select using (public.is_org_member(public.project_org(project_id)));

drop policy if exists "tasks_insert" on public.tasks;
create policy "tasks_insert" on public.tasks
  for insert with check (public.has_org_role(public.project_org(project_id), 'member'));

drop policy if exists "tasks_update" on public.tasks;
create policy "tasks_update" on public.tasks
  for update using (
    public.has_org_role(public.project_org(project_id), 'member')
    or assignee_id = auth.uid()
  );

drop policy if exists "tasks_delete" on public.tasks;
create policy "tasks_delete" on public.tasks
  for delete using (
    public.has_org_role(public.project_org(project_id), 'member')
  );

-- ============================================================
-- task_dependencies
-- ============================================================
drop policy if exists "deps_select" on public.task_dependencies;
create policy "deps_select" on public.task_dependencies
  for select using (
    public.is_org_member(public.project_org((select project_id from public.tasks where id = task_id)))
  );

drop policy if exists "deps_insert" on public.task_dependencies;
create policy "deps_insert" on public.task_dependencies
  for insert with check (
    public.has_org_role(public.project_org((select project_id from public.tasks where id = task_id)), 'member')
  );

drop policy if exists "deps_update" on public.task_dependencies;
create policy "deps_update" on public.task_dependencies
  for update using (
    public.has_org_role(public.project_org((select project_id from public.tasks where id = task_id)), 'member')
  );

drop policy if exists "deps_delete" on public.task_dependencies;
create policy "deps_delete" on public.task_dependencies
  for delete using (
    public.has_org_role(public.project_org((select project_id from public.tasks where id = task_id)), 'member')
  );

-- ============================================================
-- subtasks
-- ============================================================
drop policy if exists "subtasks_select" on public.subtasks;
create policy "subtasks_select" on public.subtasks
  for select using (
    public.is_org_member(public.project_org((select project_id from public.tasks where id = task_id)))
  );

drop policy if exists "subtasks_insert" on public.subtasks;
create policy "subtasks_insert" on public.subtasks
  for insert with check (
    public.has_org_role(public.project_org((select project_id from public.tasks where id = task_id)), 'member')
  );

drop policy if exists "subtasks_update" on public.subtasks;
create policy "subtasks_update" on public.subtasks
  for update using (
    public.has_org_role(public.project_org((select project_id from public.tasks where id = task_id)), 'member')
  );

drop policy if exists "subtasks_delete" on public.subtasks;
create policy "subtasks_delete" on public.subtasks
  for delete using (
    public.has_org_role(public.project_org((select project_id from public.tasks where id = task_id)), 'member')
  );

-- ============================================================
-- task_activity_log
-- ============================================================
drop policy if exists "activity_select" on public.task_activity_log;
create policy "activity_select" on public.task_activity_log
  for select using (
    public.is_org_member(public.project_org((select project_id from public.tasks where id = task_id)))
  );

drop policy if exists "activity_insert" on public.task_activity_log;
create policy "activity_insert" on public.task_activity_log
  for insert with check (
    public.is_org_member(public.project_org((select project_id from public.tasks where id = task_id)))
  );

-- ============================================================
-- chat_rooms
-- ============================================================
drop policy if exists "rooms_select" on public.chat_rooms;
create policy "rooms_select" on public.chat_rooms
  for select using (public.is_org_member(public.project_org(project_id)));

drop policy if exists "rooms_insert" on public.chat_rooms;
create policy "rooms_insert" on public.chat_rooms
  for insert with check (public.is_org_member(public.project_org(project_id)));

-- ============================================================
-- chat_messages
-- ============================================================
drop policy if exists "messages_select" on public.chat_messages;
create policy "messages_select" on public.chat_messages
  for select using (
    public.is_org_member(public.project_org((select project_id from public.chat_rooms where id = room_id)))
  );

drop policy if exists "messages_insert" on public.chat_messages;
create policy "messages_insert" on public.chat_messages
  for insert with check (
    sender_id = auth.uid()
    and public.is_org_member(public.project_org((select project_id from public.chat_rooms where id = room_id)))
  );

drop policy if exists "messages_update" on public.chat_messages;
create policy "messages_update" on public.chat_messages
  for update using (sender_id = auth.uid());

-- ============================================================
-- files
-- ============================================================
drop policy if exists "files_select" on public.files;
create policy "files_select" on public.files
  for select using (public.is_org_member(organization_id));

drop policy if exists "files_insert" on public.files;
create policy "files_insert" on public.files
  for insert with check (
    public.has_org_role(organization_id, 'member')
    and uploaded_by = auth.uid()
  );

drop policy if exists "files_delete" on public.files;
create policy "files_delete" on public.files
  for delete using (public.has_org_role(organization_id, 'member'));

-- ============================================================
-- approval_flows / approval_steps
-- ============================================================
drop policy if exists "flows_select" on public.approval_flows;
create policy "flows_select" on public.approval_flows
  for select using (public.is_org_member(organization_id));

drop policy if exists "flows_insert" on public.approval_flows;
create policy "flows_insert" on public.approval_flows
  for insert with check (public.has_org_role(organization_id, 'admin'));

drop policy if exists "flows_update" on public.approval_flows;
create policy "flows_update" on public.approval_flows
  for update using (public.has_org_role(organization_id, 'admin'));

drop policy if exists "flows_delete" on public.approval_flows;
create policy "flows_delete" on public.approval_flows
  for delete using (public.has_org_role(organization_id, 'admin'));

drop policy if exists "steps_select" on public.approval_steps;
create policy "steps_select" on public.approval_steps
  for select using (
    public.is_org_member((select organization_id from public.approval_flows where id = flow_id))
  );

drop policy if exists "steps_insert" on public.approval_steps;
create policy "steps_insert" on public.approval_steps
  for insert with check (
    public.has_org_role((select organization_id from public.approval_flows where id = flow_id), 'admin')
  );

drop policy if exists "steps_update" on public.approval_steps;
create policy "steps_update" on public.approval_steps
  for update using (
    public.has_org_role((select organization_id from public.approval_flows where id = flow_id), 'admin')
  );

drop policy if exists "steps_delete" on public.approval_steps;
create policy "steps_delete" on public.approval_steps
  for delete using (
    public.has_org_role((select organization_id from public.approval_flows where id = flow_id), 'admin')
  );

-- ============================================================
-- ai_settings (admin only; encrypted key never exposed via API)
-- ============================================================
drop policy if exists "ai_settings_select" on public.ai_settings;
create policy "ai_settings_select" on public.ai_settings
  for select using (public.has_org_role(organization_id, 'admin'));

drop policy if exists "ai_settings_insert" on public.ai_settings;
create policy "ai_settings_insert" on public.ai_settings
  for insert with check (public.has_org_role(organization_id, 'admin'));

drop policy if exists "ai_settings_update" on public.ai_settings;
create policy "ai_settings_update" on public.ai_settings
  for update using (public.has_org_role(organization_id, 'admin'));

drop policy if exists "ai_settings_delete" on public.ai_settings;
create policy "ai_settings_delete" on public.ai_settings
  for delete using (public.has_org_role(organization_id, 'admin'));

-- ============================================================
-- notifications (owner only)
-- ============================================================
drop policy if exists "notifications_select" on public.notifications;
create policy "notifications_select" on public.notifications
  for select using (user_id = auth.uid());

drop policy if exists "notifications_update" on public.notifications;
create policy "notifications_update" on public.notifications
  for update using (user_id = auth.uid());

drop policy if exists "notifications_delete" on public.notifications;
create policy "notifications_delete" on public.notifications
  for delete using (user_id = auth.uid());

-- ============================================================
-- audit_logs (manager+)
-- ============================================================
drop policy if exists "audit_select" on public.audit_logs;
create policy "audit_select" on public.audit_logs
  for select using (
    organization_id is not null
    and public.has_org_role(organization_id, 'manager')
  );

drop policy if exists "audit_insert" on public.audit_logs;
create policy "audit_insert" on public.audit_logs
  for insert with check (public.is_org_member(organization_id));