-- HU-14/T2: fixed domain roles, without implicit permissions.
create table public.roles (
  code text constraint roles_pkey primary key,
  name text not null,
  description text,
  constraint roles_code_check check (code in ('collaborator', 'developer', 'admin')),
  constraint roles_name_check check (
    char_length(name) between 1 and 80
    and name ~ '[^[:space:]]'
    and name !~ '[[:cntrl:]]'
  )
);

alter table public.roles enable row level security;
revoke all on table public.roles from public, anon, authenticated, service_role;
grant select on table public.roles to authenticated;
create policy roles_select_authenticated
  on public.roles for select to authenticated using (true);

insert into public.roles (code, name, description) values
  ('collaborator', 'Colaborador', 'Cuenta registrada que participa en la plataforma.'),
  ('developer', 'Desarrollador', 'Cuenta de desarrollador web con futuras funciones propias.'),
  ('admin', 'Administrador', 'Cuenta con futuras funciones administrativas.');

-- PostgreSQL applies this constant default to existing and future profiles.
-- No UPDATE is needed: original attributes and timestamps stay untouched.
alter table public.profiles
  add column role_code text not null default 'collaborator',
  add constraint profiles_role_code_fkey foreign key (role_code)
    references public.roles (code) on update restrict on delete restrict;

-- Existing profiles ACLs already prohibit writes, including the new column.
-- Auth keeps inserting only the UUID; metadata never controls this default.
create or replace function private.set_profile_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- These timestamps are managed by the database, not supplied by an updater.
  new.created_at := old.created_at;
  if row(new.id, new.display_name, new.trust_level, new.is_active, new.role_code)
     is distinct from row(old.id, old.display_name, old.trust_level, old.is_active, old.role_code) then
    new.updated_at := clock_timestamp();
  else
    new.updated_at := old.updated_at;
  end if;
  return new;
end;
$$;

revoke all on function private.set_profile_updated_at()
  from public, anon, authenticated, service_role;

