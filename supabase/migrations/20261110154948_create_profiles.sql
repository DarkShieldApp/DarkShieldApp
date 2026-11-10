-- HU-14/T1: Auth owns identity; profiles owns Dark-Shield domain data.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated, service_role;

create table public.profiles (
  id uuid constraint profiles_pkey primary key,
  display_name text,
  trust_level smallint not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_auth_user_fkey foreign key (id)
    references auth.users (id) on delete restrict,
  constraint profiles_display_name_check check (
    display_name is null or (
      char_length(display_name) between 1 and 80
      and display_name ~ '[^[:space:]]'
      and display_name !~ '[[:cntrl:]]'
    )
  ),
  constraint profiles_trust_level_check check (trust_level between 1 and 100)
);

alter table public.profiles enable row level security;
-- Clear Supabase's possible default grants, including the privileged API role.
revoke all on table public.profiles from public, anon, authenticated, service_role;
grant select on table public.profiles to authenticated;

create policy profiles_select_own_active
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id and is_active);

create function private.set_profile_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- These timestamps are managed by the database, not supplied by an updater.
  new.created_at := old.created_at;
  if row(new.id, new.display_name, new.trust_level, new.is_active)
     is distinct from row(old.id, old.display_name, old.trust_level, old.is_active) then
    new.updated_at := clock_timestamp();
  else
    new.updated_at := old.updated_at;
  end if;
  return new;
end;
$$;

revoke all on function private.set_profile_updated_at()
  from public, anon, authenticated, service_role;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_profile_updated_at();

-- Auth's insertion role cannot write profiles. Only this internal trigger needs
-- the migration owner's privileges; it accepts no caller-supplied arguments.
create function private.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  -- Do not swallow errors: identity + profile must commit or roll back together.
  return new;
end;
$$;

revoke all on function private.create_profile_for_auth_user()
  from public, anon, authenticated, service_role;

create trigger auth_users_create_profile
  after insert on auth.users
  for each row execute function private.create_profile_for_auth_user();

-- Cover existing identities without copying untrusted metadata. Creating the
-- trigger first also covers registrations concurrent with this migration.
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;
