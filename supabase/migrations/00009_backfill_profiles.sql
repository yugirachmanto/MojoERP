-- 00009_backfill_profiles.sql
-- Backfill profiles for auth.users created before the profiles trigger existed
-- (e.g. users who signed up before 00006/00007 were applied).

insert into public.profiles (id, full_name, phone, language)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'full_name', u.email),
  u.raw_user_meta_data ->> 'phone',
  coalesce(u.raw_user_meta_data ->> 'language', 'id')
from auth.users u
on conflict (id) do nothing;