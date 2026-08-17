-- 00013_fix_task_activity.sql
-- Fix log_task_activity trigger function where jsonb_each iteration referenced non-existent f.old_value / f.new_value.

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
    select
      new.id,
      auth.uid(),
      'updated',
      f.key,
      to_jsonb(old)->f.key,
      to_jsonb(new)->f.key
    from jsonb_each(
      jsonb_build_object(
        'title', true, 'description', true, 'status', true, 'progress', true,
        'assignee_id', true, 'due_date', true, 'priority', true
      )
    ) f
    where coalesce(to_jsonb(new)->f.key, 'null'::jsonb) is distinct from coalesce(to_jsonb(old)->f.key, 'null'::jsonb);
  end if;
  return new;
end;
$$;