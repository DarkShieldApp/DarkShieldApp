-- Reapply the ACTUAL migration to a pre-profiles schema, within a transaction.
-- All DDL/data roll back; do not run database tests on a shared/live instance.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(6);
select ok((select cardinality(statements) > 0 from supabase_migrations.schema_migrations
  where version = '20261110154948'), 'CLI recorded the applied migration statements');

drop trigger auth_users_create_profile on auth.users;
drop table public.profiles;
drop function private.create_profile_for_auth_user();
drop function private.set_profile_updated_at();

insert into auth.users (id, raw_user_meta_data) values
  ('c1111111-1111-4111-8111-111111111111', '{"display_name":"Do not copy", "trust_level":100}'),
  ('c2222222-2222-4222-8222-222222222222', '{}');

-- CLI mounts only test files into pg_prove. Replay the exact SQL recorded by
-- migration up/start, without duplicating the migration or relying on host paths.
select unnest(statements) from supabase_migrations.schema_migrations
  where version = '20261110154948'
\gexec

select is((select count(*) from public.profiles), (select count(*) from auth.users),
  'Migration backfills every pre-existing identity');
select results_eq($$select display_name, trust_level, is_active from public.profiles
  where id = 'c1111111-1111-4111-8111-111111111111'$$,
  $$values (null::text, 1::smallint, true)$$, 'Backfill uses safe defaults, not metadata');
select is((select count(*) from public.profiles where id in (
  'c1111111-1111-4111-8111-111111111111', 'c2222222-2222-4222-8222-222222222222')),
  2::bigint, 'Both existing identities retain their UUID');
insert into auth.users (id) values ('c3333333-3333-4333-8333-333333333333');
select is((select count(*) from public.profiles where id = 'c3333333-3333-4333-8333-333333333333'),
  1::bigint, 'New identities still receive exactly one profile after backfill');
select ok((select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'Replayed migration enables RLS explicitly');

select * from finish();
rollback;
