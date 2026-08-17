-- 00011_backfill_owner.sql
-- Ensure each organization's creator is its single Owner member.
-- Fixes orgs created before the 'owner' role existed (00010).
update public.organization_members om
set role = 'owner'
from public.organizations o
where o.id = om.organization_id
  and o.created_by = om.user_id
  and om.status = 'active'
  and om.role <> 'owner';