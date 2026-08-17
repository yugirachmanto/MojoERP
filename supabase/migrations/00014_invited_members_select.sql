-- 00014_invited_members_select.sql
-- Allow invited users to read their own membership row so onboarding can show the invitation.

drop policy if exists "members_select" on public.organization_members;
create policy "members_select" on public.organization_members
  for select using (
    public.is_org_member(organization_id)
    or user_id = auth.uid()
  );
