begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

insert into auth.users (id) values
  ('b1111111-1111-4111-8111-111111111111'),
  ('b2222222-2222-4222-8222-222222222222');

select ok((select relrowsecurity from pg_class where oid = 'public.profiles'::regclass), 'RLS enabled');
select is((select count(*) from pg_policies where schemaname = 'public' and tablename = 'profiles'),
  1::bigint, 'Only one initial access policy');
select ok(has_table_privilege('authenticated', 'public.profiles', 'SELECT'), 'Authenticated has SELECT');
select ok(not has_table_privilege('anon', 'public.profiles', 'SELECT'), 'Anon lacks SELECT');
select ok(not has_table_privilege(r, 'public.profiles', p), r || ' lacks ' || p)
from unnest(array['anon', 'authenticated', 'service_role']) r
cross join unnest(array['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']) p;
select ok(not has_any_column_privilege(r, 'public.profiles', p), r || ' has no column-level ' || p)
from unnest(array['anon', 'authenticated']) r
cross join unnest(array['INSERT', 'UPDATE']) p;
select ok(not has_schema_privilege(r, 'private', 'USAGE'), r || ' cannot use private schema')
from unnest(array['anon', 'authenticated', 'service_role']) r;
select ok(not has_function_privilege(r, f, 'EXECUTE'), r || ' cannot execute ' || f)
from unnest(array['anon', 'authenticated', 'service_role']) r
cross join unnest(array['private.create_profile_for_auth_user()', 'private.set_profile_updated_at()']) f;
select ok((select prosecdef and proconfig @> array['search_path=""']
  from pg_proc where oid = 'private.create_profile_for_auth_user()'::regprocedure),
  'Auth trigger is definer with an empty search_path');
select ok((select not prosecdef and proconfig @> array['search_path=""']
  from pg_proc where oid = 'private.set_profile_updated_at()'::regprocedure),
  'Timestamp trigger is invoker with an empty search_path');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b1111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
select is(current_user::text, 'authenticated', 'Queries run as authenticated, not owner');
select results_eq($$select id from public.profiles$$,
  $$values ('b1111111-1111-4111-8111-111111111111'::uuid)$$, 'Only own active profile visible');
select is((select count(*) from public.profiles where id = 'b2222222-2222-4222-8222-222222222222'),
  0::bigint, 'Other profile is invisible');
select throws_ok($$insert into public.profiles (id) values ('b9999999-9999-4999-8999-999999999999')$$,
  '42501', null, 'Arbitrary insert denied');
select throws_ok($$update public.profiles set trust_level = 100 where id = auth.uid()$$,
  '42501', null, 'Own trust update denied');
select throws_ok($$update public.profiles set is_active = false where id = auth.uid()$$,
  '42501', null, 'Own activity update denied');
select throws_ok($$update public.profiles set display_name = 'Changed' where id = auth.uid()$$,
  '42501', null, 'Own name update denied in T1');
select throws_ok($$update public.profiles set trust_level = 100 where id = 'b2222222-2222-4222-8222-222222222222'$$,
  '42501', null, 'Other profile update denied');
select throws_ok($$delete from public.profiles where id = auth.uid()$$, '42501', null, 'Own deletion denied');
select throws_ok($$truncate public.profiles$$, '42501', null, 'Truncate denied');
select throws_ok($$select private.create_profile_for_auth_user()$$, '42501', null, 'Privileged function cannot be called directly');
select set_config('request.jwt.claims', '{"sub":"b2222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
select results_eq($$select id from public.profiles$$,
  $$values ('b2222222-2222-4222-8222-222222222222'::uuid)$$, 'Changing identity changes visible profile');
select set_config('request.jwt.claims', '{"role":"authenticated"}', true);
select is((select count(*) from public.profiles), 0::bigint, 'Missing subject does not authorize rows');
reset role;

update public.profiles set is_active = false where id = 'b1111111-1111-4111-8111-111111111111';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b1111111-1111-4111-8111-111111111111","role":"authenticated","user_metadata":{"is_active":true,"trust_level":100}}', true);
select is((select count(*) from public.profiles), 0::bigint, 'Inactive user cannot read, regardless of metadata');
select throws_ok($$update public.profiles set is_active = true where id = auth.uid()$$,
  '42501', null, 'Inactive user cannot reactivate their profile');
reset role;

set local role anon;
select set_config('request.jwt.claims', '{}', true);
select is(current_user::text, 'anon', 'Anonymous queries use the actual anon role');
select throws_ok($$select * from public.profiles$$, '42501', null, 'Anonymous read denied');
select throws_ok($$insert into public.profiles (id) values ('b9999999-9999-4999-8999-999999999999')$$,
  '42501', null, 'Anonymous insert denied');
select throws_ok($$update public.profiles set trust_level = 100$$, '42501', null, 'Anonymous update denied');
select throws_ok($$delete from public.profiles$$, '42501', null, 'Anonymous delete denied');
reset role;

-- Independently prove RLS denies writes even if a later migration accidentally
-- grants DML. These temporary grants roll back; assertions above cover real ACLs.
grant insert, update, delete on public.profiles to authenticated;
grant select on public.profiles to anon;
set local role anon;
select is((select count(*) from public.profiles), 0::bigint, 'RLS also denies anonymous rows independently of ACLs');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b2222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
select throws_ok($$insert into public.profiles (id) values ('b9999999-9999-4999-8999-999999999999')$$,
  '42501', null, 'RLS denies insert even with a temporary INSERT grant');
with changed as (update public.profiles set trust_level = 100 returning id)
select is((select count(*) from changed),
  0::bigint, 'No UPDATE policy permits modifying a row');
with removed as (delete from public.profiles returning id)
select is((select count(*) from removed),
  0::bigint, 'No DELETE policy permits removing a row');
reset role;

select * from finish();
rollback;
