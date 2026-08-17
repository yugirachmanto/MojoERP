-- 00004_rpc.sql
-- RPC functions called from server actions

-- ============================================================
-- Bootstrap a new organization (org + default approval flow + admin member)
-- Security definer so the first membership can be created atomically.
-- ============================================================
create or replace function public.bootstrap_organization(_name text, _timezone text default 'UTC')
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  _org_id uuid;
  _flow_id uuid;
  _slug text;
  _uid uuid := auth.uid();
begin
  if _uid is null then
    raise exception 'Not authenticated';
  end if;

  _slug := trim(both '-' from lower(regexp_replace(_name, '[^a-z0-9]+', '-', 'g')));
  if _slug = '' then
    _slug := 'org';
  end if;
  _slug := left(_slug, 40) || '-' || substr(md5(random()::text), 1, 6);

  insert into public.organizations (name, slug, timezone, created_by)
  values (_name, _slug, _timezone, _uid)
  returning id into _org_id;

  insert into public.approval_flows (organization_id, name, is_default, requires_signature)
  values (_org_id, 'Default 3-Level Approval', true, true)
  returning id into _flow_id;

  insert into public.approval_steps (flow_id, step_number, required_role, required_level)
  values
    (_flow_id, 1, 'project_lead', null),
    (_flow_id, 2, 'manager', null),
    (_flow_id, 3, 'director', null);

  update public.organizations
  set approval_flow_id = _flow_id
  where id = _org_id;

  insert into public.organization_members (organization_id, user_id, role, status)
  values (_org_id, _uid, 'owner', 'active');

  return _org_id;
end;
$$;

grant execute on function public.bootstrap_organization(text, text) to authenticated;