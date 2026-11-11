begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

insert into auth.users (id, raw_user_meta_data) values
  ('e1111111-1111-4111-8111-111111111111', '{"role_code":"admin"}');
select ok((select relrowsecurity from pg_class where oid = 'public.roles'::regclass), 'Catalog RLS enabled');
select is((select count(*) from pg_policies where schemaname = 'public' and tablename = 'roles'), 1::bigint, 'Only catalog read policy');
select ok(not has_table_privilege(r, 'public.roles', p), r || ' lacks ' || p)
from unnest(array['anon', 'authenticated', 'service_role']) r
cross join unnest(array['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']) p;
select ok(not has_any_column_privilege(r, t, p), r || ' lacks column ' || p || ' on ' || t)
from unnest(array['anon', 'authenticated']) r
cross join unnest(array['public.roles', 'public.profiles']) t
cross join unnest(array['INSERT', 'UPDATE']) p;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"e1111111-1111-4111-8111-111111111111","role":"authenticated","user_metadata":{"role_code":"admin"}}', true);
select results_eq($$select code from public.roles order by code$$,
  $$values ('admin'), ('collaborator'), ('developer')$$, 'Authenticated reads exactly three public roles');
select is((select role_code from public.profiles where id = auth.uid()), 'collaborator', 'Forged metadata has no authority');
select throws_ok($$insert into public.roles (code, name) values ('admin', 'Fake')$$, '42501', null, 'Authenticated insert denied');
select throws_ok($$update public.roles set name = 'Fake'$$, '42501', null, 'Authenticated update denied');
select throws_ok($$delete from public.roles$$, '42501', null, 'Authenticated delete denied');
select throws_ok($$update public.profiles set role_code = 'admin' where id = auth.uid()$$, '42501', null, 'Self-promotion denied');
reset role;
set local role anon;
select throws_ok($$select * from public.roles$$, '42501', null, 'Anonymous catalog read denied');
select throws_ok($$insert into public.roles (code, name) values ('admin', 'Fake')$$, '42501', null, 'Anonymous insert denied');
select throws_ok($$update public.roles set name = 'Fake'$$, '42501', null, 'Anonymous update denied');
select throws_ok($$delete from public.roles$$, '42501', null, 'Anonymous delete denied');
select throws_ok($$update public.profiles set role_code = 'admin'$$, '42501', null, 'Anonymous promotion denied');
reset role;

-- Temporary grants isolate RLS from ACLs; all are rolled back.
grant select, insert, update, delete on public.roles to anon, authenticated;
grant update (role_code) on public.profiles to authenticated;
set local role authenticated;
select throws_ok($$insert into public.roles (code, name) values ('admin', 'Fake')$$, '42501', null, 'RLS rejects catalog insertion independently');
with changed as (update public.roles set name = 'Fake' returning code)
select is((select count(*) from changed), 0::bigint, 'RLS blocks catalog updates');
with removed as (delete from public.roles returning code)
select is((select count(*) from removed), 0::bigint, 'RLS blocks catalog deletion');
with changed as (update public.profiles set role_code = 'admin' where id = auth.uid() returning id)
select is((select count(*) from changed), 0::bigint, 'Profile RLS blocks self-promotion independently');
reset role;
set local role anon;
select is((select count(*) from public.roles), 0::bigint, 'RLS hides catalog from anon even with SELECT');
select throws_ok($$insert into public.roles (code, name) values ('admin', 'Fake')$$, '42501', null, 'Anonymous RLS rejects insert');
with changed as (update public.roles set name = 'Fake' returning code)
select is((select count(*) from changed), 0::bigint, 'Anonymous RLS blocks update');
with removed as (delete from public.roles returning code)
select is((select count(*) from removed), 0::bigint, 'Anonymous RLS blocks delete');
reset role;
select * from finish();
rollback;
