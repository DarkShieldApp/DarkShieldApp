begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

select has_table('public', 'profiles', 'Profiles exists');
select columns_are('public', 'profiles', array[
  'id', 'display_name', 'trust_level', 'is_active', 'created_at', 'updated_at'
], 'Only the agreed domain attributes exist');
select col_type_is('public', 'profiles', 'id', 'uuid', 'Column contract: id');
select col_type_is('public', 'profiles', 'display_name', 'text', 'Column contract: display_name');
select col_type_is('public', 'profiles', 'trust_level', 'smallint', 'Column contract: trust_level');
select col_type_is('public', 'profiles', 'is_active', 'boolean', 'Column contract: is_active');
select col_type_is('public', 'profiles', 'created_at', 'timestamp with time zone', 'Column contract: created_at');
select col_type_is('public', 'profiles', 'updated_at', 'timestamp with time zone', 'Column contract: updated_at');
select col_is_pk('public', 'profiles', 'id', 'Column contract: id');
select fk_ok('public', 'profiles', 'id', 'auth', 'users', 'id');
select col_is_null('public', 'profiles', 'display_name', 'Column contract: display_name');
select col_not_null('public', 'profiles', 'id', 'Column contract: id');
select col_not_null('public', 'profiles', 'trust_level', 'Column contract: trust_level');
select col_not_null('public', 'profiles', 'is_active', 'Column contract: is_active');
select col_not_null('public', 'profiles', 'created_at', 'Column contract: created_at');
select col_not_null('public', 'profiles', 'updated_at', 'Column contract: updated_at');
select col_hasnt_default('public', 'profiles', 'id', 'Column contract: id');
select col_default_is('public', 'profiles', 'trust_level', '1', 'Column contract: trust_level');
select col_default_is('public', 'profiles', 'is_active', 'true', 'Column contract: is_active');
select col_default_is('public', 'profiles', 'created_at', 'now()', 'Column contract: created_at');
select col_default_is('public', 'profiles', 'updated_at', 'now()', 'Column contract: updated_at');

-- Insert controlled identities with intentionally untrusted metadata.
insert into auth.users (id, raw_user_meta_data) values
  ('a1111111-1111-4111-8111-111111111111',
   '{"display_name":"UNTRUSTED", "trust_level":100, "is_active":false}');
select is((select count(*) from public.profiles where id = 'a1111111-1111-4111-8111-111111111111'),
  1::bigint, 'Auth creates exactly one profile with the shared UUID');
select results_eq(
  $$select display_name, trust_level, is_active from public.profiles
    where id = 'a1111111-1111-4111-8111-111111111111'$$,
  $$values (null::text, 1::smallint, true)$$,
  'Defaults are applied and metadata is ignored');
select ok((select created_at = now() and updated_at = now() from public.profiles
  where id = 'a1111111-1111-4111-8111-111111111111'), 'Both timestamps default to transaction time');

select lives_ok($$update public.profiles set trust_level = 1
  where id = 'a1111111-1111-4111-8111-111111111111'$$, 'Trust 1 is accepted');
select lives_ok($$update public.profiles set trust_level = 100
  where id = 'a1111111-1111-4111-8111-111111111111'$$, 'Trust 100 is accepted');
select throws_ok($$update public.profiles set trust_level = 0 where id = 'a1111111-1111-4111-8111-111111111111'$$, '23514', null, 'Trust 0 is rejected');
select throws_ok($$update public.profiles set trust_level = 101 where id = 'a1111111-1111-4111-8111-111111111111'$$, '23514', null, 'Trust 101 is rejected');
select throws_ok($$update public.profiles set trust_level = -1 where id = 'a1111111-1111-4111-8111-111111111111'$$, '23514', null, 'Negative trust is rejected');
select throws_ok($$update public.profiles set trust_level = null where id = 'a1111111-1111-4111-8111-111111111111'$$, '23502', null, 'Null trust is rejected');
select throws_ok($$update public.profiles set trust_level = '1.5' where id = 'a1111111-1111-4111-8111-111111111111'$$, '22P02', null, 'Fractional text input is rejected by smallint');
-- A SQL numeric expression is converted BEFORE checks/triggers. This assertion
-- documents PostgreSQL coercion, not a promise that smallint rejects all casts.
select is(1.5::smallint, 2::smallint, 'Numeric-to-smallint conversion rounds before constraints');
select throws_ok($$update public.profiles set is_active = null where id = 'a1111111-1111-4111-8111-111111111111'$$, '23502', null, 'Null activity is rejected');

select lives_ok($$update public.profiles set display_name = 'A' where id = 'a1111111-1111-4111-8111-111111111111'$$, 'One character name accepted');
select lives_ok($$update public.profiles set display_name = repeat('ñ', 80) where id = 'a1111111-1111-4111-8111-111111111111'$$, '80 Unicode characters accepted');
select throws_ok($$update public.profiles set display_name = repeat('a', 81) where id = 'a1111111-1111-4111-8111-111111111111'$$, '23514', null, '81 characters rejected');
select throws_ok($$update public.profiles set display_name = '' where id = 'a1111111-1111-4111-8111-111111111111'$$, '23514', null, 'Empty name rejected');
select throws_ok($$update public.profiles set display_name = '   ' where id = 'a1111111-1111-4111-8111-111111111111'$$, '23514', null, 'Whitespace-only name rejected');
select throws_ok($$update public.profiles set display_name = E'\t\n' where id = 'a1111111-1111-4111-8111-111111111111'$$, '23514', null, 'Whitespace controls rejected');
select throws_ok($$update public.profiles set display_name = E'A\nB' where id = 'a1111111-1111-4111-8111-111111111111'$$, '23514', null, 'Embedded control characters rejected');
select lives_ok($$update public.profiles set display_name = null where id = 'a1111111-1111-4111-8111-111111111111'$$, 'Null name accepted');

select throws_ok($$insert into public.profiles (id) values ('a1111111-1111-4111-8111-111111111111')$$,
  '23505', null, 'Duplicate profile rejected');
select throws_ok($$insert into public.profiles (id) values ('a9999999-9999-4999-8999-999999999999')$$,
  '23503', null, 'Profile without Auth identity rejected');
select throws_ok($$delete from auth.users where id = 'a1111111-1111-4111-8111-111111111111'$$,
  '23503', null, 'Auth deletion cannot cascade into the profile');

create temporary table profile_before as select * from public.profiles
  where id = 'a1111111-1111-4111-8111-111111111111';
update public.profiles set display_name = display_name
  where id = 'a1111111-1111-4111-8111-111111111111';
select is((select updated_at from public.profiles where id = 'a1111111-1111-4111-8111-111111111111'),
  (select updated_at from profile_before), 'No-op does not advance updated_at');
update public.profiles set updated_at = '2000-01-01', created_at = '2000-01-01'
  where id = 'a1111111-1111-4111-8111-111111111111';
select results_eq($$select created_at, updated_at from public.profiles where id = 'a1111111-1111-4111-8111-111111111111'$$,
  $$select created_at, updated_at from profile_before$$, 'Timestamp-only update preserves both timestamps');
update public.profiles set display_name = 'Changed'
  where id = 'a1111111-1111-4111-8111-111111111111';
select ok((select p.updated_at > b.updated_at and p.created_at = b.created_at
  from public.profiles p join profile_before b using (id)), 'Real change advances updated_at and preserves created_at');
update profile_before set updated_at = (select updated_at from public.profiles where id = profile_before.id);
update public.profiles set is_active = false where id = 'a1111111-1111-4111-8111-111111111111';
select ok((select p.updated_at > b.updated_at from public.profiles p join profile_before b using (id)),
  'Deactivation also advances updated_at');
select is((select count(*) from auth.users where id = 'a1111111-1111-4111-8111-111111111111'),
  1::bigint, 'Logical deactivation preserves identity');

-- A failure in profile creation must roll back the corresponding Auth insert.
-- DDL and data are transactional and restored by the final rollback.
alter table public.profiles add constraint test_profile_failure
  check (id <> 'a2222222-2222-4222-8222-222222222222');
select throws_ok($$insert into auth.users (id) values ('a2222222-2222-4222-8222-222222222222')$$,
  '23514', null, 'Trigger propagates errors instead of leaving partial identity');
select is((select count(*) from auth.users where id = 'a2222222-2222-4222-8222-222222222222'),
  0::bigint, 'Failed profile creation leaves no identity');

select * from finish();
rollback;
