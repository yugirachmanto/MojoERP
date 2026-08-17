-- 00005_storage.sql
-- Storage buckets + object policies

insert into storage.buckets (id, name, public)
values
  ('project-files', 'project-files', false),
  ('chat-attachments', 'chat-attachments', false)
on conflict (id) do nothing;

-- Object policies are per-bucket; path convention:
--   <orgId>/<projectId>/<uuid>_<filename>

create or replace function public.storage_org_id(path text)
returns uuid
language sql immutable
as $$
  select nullif(split_part(path, '/', 1), '')::uuid;
$$;

-- project-files: any active org member can read/write within their org's folders
drop policy if exists "project_files_read" on storage.objects;
create policy "project_files_read" on storage.objects
  for select
  using (
    bucket_id = 'project-files'
    and public.is_org_member(public.storage_org_id(name))
  );

drop policy if exists "project_files_insert" on storage.objects;
create policy "project_files_insert" on storage.objects
  for insert
  with check (
    bucket_id = 'project-files'
    and public.has_org_role(public.storage_org_id(name), 'member')
    and auth.uid() is not null
  );

drop policy if exists "project_files_update" on storage.objects;
create policy "project_files_update" on storage.objects
  for update
  using (
    bucket_id = 'project-files'
    and public.has_org_role(public.storage_org_id(name), 'member')
  );

drop policy if exists "project_files_delete" on storage.objects;
create policy "project_files_delete" on storage.objects
  for delete
  using (
    bucket_id = 'project-files'
    and public.has_org_role(public.storage_org_id(name), 'member')
  );

-- chat-attachments: same rules
drop policy if exists "chat_attachments_read" on storage.objects;
create policy "chat_attachments_read" on storage.objects
  for select
  using (
    bucket_id = 'chat-attachments'
    and public.is_org_member(public.storage_org_id(name))
  );

drop policy if exists "chat_attachments_insert" on storage.objects;
create policy "chat_attachments_insert" on storage.objects
  for insert
  with check (
    bucket_id = 'chat-attachments'
    and public.has_org_role(public.storage_org_id(name), 'member')
    and auth.uid() is not null
  );

drop policy if exists "chat_attachments_delete" on storage.objects;
create policy "chat_attachments_delete" on storage.objects
  for delete
  using (
    bucket_id = 'chat-attachments'
    and public.has_org_role(public.storage_org_id(name), 'member')
  );