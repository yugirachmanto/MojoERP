-- 00007_profiles_phone.sql
-- Add phone to user profile and sync from auth.users metadata

alter table public.profiles
  add column phone text;

-- Capture phone at signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.raw_user_meta_data ->> 'phone'
  );
  return new;
end;
$$;

-- Keep profile in sync when name/phone metadata changes
create or replace function public.sync_profile_full_name()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  update public.profiles
  set full_name = coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
      phone = coalesce(new.raw_user_meta_data ->> 'phone', null),
      updated_at = now()
  where id = new.id;
  return new;
end;
$$;