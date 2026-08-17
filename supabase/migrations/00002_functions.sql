-- 00002_functions.sql
-- Helper functions + triggers

-- ============================================================
-- updated_at trigger helper
-- ============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- ============================================================
-- Membership helpers (used by RLS policies)
-- ============================================================
create or replace function public.is_org_member(_org uuid)
returns boolean
language sql stable security definer
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = _org
      and om.user_id = auth.uid()
      and om.status = 'active'
  );
$$;

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
        when 'admin'     then om.role = 'admin'
        when 'manager'   then om.role in ('admin', 'manager')
        when 'member'    then om.role in ('admin', 'manager', 'member')
        when 'viewer'    then om.role in ('admin', 'manager', 'member', 'viewer')
        else false
      end
  );
$$;

-- Resolve organization id for a project id (helper for RLS on child tables)
create or replace function public.project_org(_project uuid)
returns uuid
language sql stable
as $$
  select organization_id from public.projects where id = _project;
$$;

-- ============================================================
-- Chat room auto-create when a project is created
-- ============================================================
create or replace function public.create_project_chat_room()
returns trigger
language plpgsql
as $$
begin
  insert into public.chat_rooms (project_id, name)
  values (new.id, 'General');
  return new;
end;
$$;

drop trigger if exists projects_chat_room_trigger on public.projects;
create trigger projects_chat_room_trigger
  after insert on public.projects
  for each row execute function public.create_project_chat_room();

-- ============================================================
-- Task activity log trigger
-- ============================================================
create or replace function public.log_task_activity()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.task_activity_log (task_id, actor_id, action, new_value)
    values (new.id, auth.uid(), 'created', to_jsonb(new));
  elsif tg_op = 'UPDATE' then
    insert into public.task_activity_log (
      task_id, actor_id, action, field, old_value, new_value
    )
    select new.id, auth.uid(), 'updated', f.field, f.old_value, f.new_value
    from jsonb_each(
      jsonb_build_object(
        'title', true, 'description', true, 'status', true, 'progress', true,
        'assignee_id', true, 'due_date', true, 'priority', true
      )
    ) f(field, ignore)
    where coalesce(to_jsonb(new)->f.field, 'null'::jsonb) is distinct from coalesce(to_jsonb(old)->f.field, 'null'::jsonb);
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_activity_trigger on public.tasks;
create trigger tasks_activity_trigger
  after insert or update on public.tasks
  for each row execute function public.log_task_activity();

-- ============================================================
-- Task completion bookkeeping (set completed_at when done)
-- ============================================================
create or replace function public.tasks_completed_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'done' and new.completed_at is null then
    new.completed_at = now();
  elsif new.status <> 'done' then
    new.completed_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_completed_at_trigger on public.tasks;
create trigger tasks_completed_at_trigger
  before update on public.tasks
  for each row execute function public.tasks_completed_at();

-- ============================================================
-- Notifications for new task assignment
-- ============================================================
create or replace function public.notify_task_assigned()
returns trigger
language plpgsql
as $$
begin
  if new.assignee_id is not null
     and (tg_op = 'INSERT' or new.assignee_id is distinct from old.assignee_id) then
    insert into public.notifications (
      organization_id, user_id, type, title, body, metadata
    )
    select
      p.organization_id,
      new.assignee_id,
      'task_assigned',
      'Task assigned to you',
      new.title,
      jsonb_build_object('task_id', new.id, 'project_id', new.project_id)
    from public.projects p
    where p.id = new.project_id;
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_assigned_notify_trigger on public.tasks;
create trigger tasks_assigned_notify_trigger
  after insert or update of assignee_id on public.tasks
  for each row execute function public.notify_task_assigned();

-- ============================================================
-- Audit log helper (called from server actions)
-- ============================================================
create or replace function public.write_audit_log(
  _org uuid,
  _action text,
  _entity_type text default null,
  _entity_id uuid default null,
  _before jsonb default null,
  _after jsonb default null,
  _metadata jsonb default '{}'::jsonb
)
returns void
language sql
as $$
  insert into public.audit_logs (
    organization_id, actor_id, action, entity_type, entity_id, before, after, metadata
  )
  values (_org, auth.uid(), _action, _entity_type, _entity_id, _before, _after, _metadata);
$$;

grant execute on function public.write_audit_log(uuid, text, text, uuid, jsonb, jsonb, jsonb) to authenticated;