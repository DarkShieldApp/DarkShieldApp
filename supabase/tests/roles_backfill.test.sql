-- Reconstruct T1 and replay the actual recorded T2, locally and transactionally.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(5);
select ok((select cardinality(statements) > 0 from supabase_migrations.schema_migrations
  where version = '20261111113011'), 'T2 SQL is recorded');
alter table public.profiles drop column role_code;
drop table public.roles;
-- Restore the historical timestamp function from the actual T1 statements.
select replace(statement, 'create function private.set_profile_updated_at()',
  'create or replace function private.set_profile_updated_at()') from supabase_migrations.schema_migrations,
  unnest(statements) statement
  where version = '20261110154948'
  and statement like '%create function private.set_profile_updated_at()%'
\gexec
insert into auth.users (id, raw_user_meta_data) values
  ('f1111111-1111-4111-8111-111111111111', '{"role_code":"admin"}');
update public.profiles set display_name = 'Existing', trust_level = 42, is_active = false
  where id = 'f1111111-1111-4111-8111-111111111111';
create temporary table before_t2 as select * from public.profiles;
select unnest(statements) from supabase_migrations.schema_migrations
  where version = '20261111113011'
\gexec
select results_eq($$select id, display_name, trust_level, is_active, created_at, updated_at
  from public.profiles order by id$$, $$select * from before_t2 order by id$$,
  'T2 preserves every existing profile attribute and timestamp');
select is((select count(*) from public.profiles where role_code = 'collaborator'),
  (select count(*) from before_t2), 'Every pre-T2 profile receives collaborator');
insert into auth.users (id) values ('f2222222-2222-4222-8222-222222222222');
select is((select role_code from public.profiles where id = 'f2222222-2222-4222-8222-222222222222'),
  'collaborator', 'Unchanged Auth trigger works after T2');
update public.profiles set role_code = 'admin' where id = 'f1111111-1111-4111-8111-111111111111';
select ok((select p.updated_at > b.updated_at from public.profiles p join before_t2 b using (id)
  where p.id = 'f1111111-1111-4111-8111-111111111111'), 'Replayed T2 updates timestamp on role change');
select * from finish();
rollback;
