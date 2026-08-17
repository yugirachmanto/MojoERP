-- 00008_profile_language.sql
-- Per-user UI language preference

alter table public.profiles
  add column language text not null default 'id' check (language in ('id', 'en'));

-- Keep language in sync when metadata changes (fallback: keep default)
create or replace function public.sync_profile_full_name()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  update public.profiles
  set full_name = coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
      phone = coalesce(new.raw_user_meta_data ->> 'phone', null),
      language = coalesce(new.raw_user_meta_data ->> 'language', language),
      updated_at = now()
  where id = new.id;
  return new;
end;
$$;