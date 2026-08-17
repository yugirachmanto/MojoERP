-- 00012_notifications_insert.sql
-- Fix: creating a task with an assignee failed with
-- "new row violates row-level security policy for table notifications"
-- because the notifications table had no INSERT policy while the
-- notify_task_assigned trigger inserts notification rows.

-- 1) System-generated notifications bypass RLS (security definer).
create or replace function public.notify_task_assigned()
returns trigger
language plpgsql security definer
set search_path = public
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

-- 2) Also allow org members to create notifications within the org.
drop policy if exists "notifications_insert" on public.notifications;
create policy "notifications_insert" on public.notifications
  for insert with check (public.is_org_member(organization_id));