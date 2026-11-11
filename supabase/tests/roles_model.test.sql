begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

select has_table('public', 'roles', 'Role catalog exists');
select columns_are('public', 'roles', array['code', 'name', 'description']);
select col_is_pk('public', 'roles', 'code', 'Code is the primary key');
select col_not_null('public', 'roles', 'name', 'Name is required');
select results_eq($$select code, name, description from public.roles order by code$$,
  $$values ('admin', 'Administrador', 'Cuenta con futuras funciones administrativas.'),
    ('collaborator', 'Colaborador', 'Cuenta registrada que participa en la plataforma.'),
    ('developer', 'Desarrollador', 'Cuenta de desarrollador web con futuras funciones propias.')$$,
  'Exactly the three agreed roles are seeded');
select throws_ok($$insert into public.roles (code, name) values ('admin', 'Duplicate')$$, '23505', null, 'Duplicate code rejected');
select throws_ok($$insert into public.roles (code, name) values ('consumer', 'Consumer')$$, '23514', null, 'Unknown code rejected');
select throws_ok($$update public.roles set name = '' where code = 'admin'$$, '23514', null, 'Empty name rejected');
select throws_ok($$update public.roles set name = E'\t' where code = 'admin'$$, '23514', null, 'Whitespace name rejected');
select throws_ok($$update public.roles set name = null where code = 'admin'$$, '23502', null, 'Null name rejected');
select col_type_is('public', 'profiles', 'role_code', 'text', 'Role code is text');
select col_not_null('public', 'profiles', 'role_code', 'Role is required');
select col_default_is('public', 'profiles', 'role_code', 'collaborator', 'Initial role is collaborator');
select fk_ok('public', 'profiles', 'role_code', 'public', 'roles', 'code');

insert into auth.users (id, raw_user_meta_data, raw_app_meta_data) values
  ('d1111111-1111-4111-8111-111111111111', '{"role":"admin","role_code":"admin"}', '{"role_code":"developer"}');
select is((select role_code from public.profiles where id = 'd1111111-1111-4111-8111-111111111111'), 'collaborator', 'Auth ignores role metadata');
select throws_ok($$update public.profiles set role_code = 'unknown' where id = 'd1111111-1111-4111-8111-111111111111'$$, '23503', null, 'Unknown profile role rejected');
select throws_ok($$update public.profiles set role_code = null where id = 'd1111111-1111-4111-8111-111111111111'$$, '23502', null, 'Null profile role rejected');
select throws_ok($$delete from public.roles where code = 'collaborator'$$, '23503', null, 'Referenced role cannot be deleted');
select ok((select confupdtype = 'r' and confdeltype = 'r' from pg_constraint
  where conrelid = 'public.profiles'::regclass and conname = 'profiles_role_code_fkey'), 'FK restricts updates and deletes');

create temporary table role_before as select * from public.profiles where id = 'd1111111-1111-4111-8111-111111111111';
update public.profiles set role_code = 'developer' where id = 'd1111111-1111-4111-8111-111111111111';
select ok((select p.updated_at > b.updated_at and p.created_at = b.created_at
  and p.trust_level = b.trust_level and p.is_active = b.is_active
  from public.profiles p join role_before b using (id)), 'Authorized role change advances only updated_at');
update role_before set updated_at = (select updated_at from public.profiles where id = role_before.id);
update public.profiles set role_code = role_code where id = 'd1111111-1111-4111-8111-111111111111';
select is((select updated_at from public.profiles where id = 'd1111111-1111-4111-8111-111111111111'), (select updated_at from role_before), 'Role no-op preserves timestamp');
update public.profiles set created_at = '2000-01-01', updated_at = '2000-01-01' where id = 'd1111111-1111-4111-8111-111111111111';
select results_eq($$select created_at, updated_at from public.profiles where id = 'd1111111-1111-4111-8111-111111111111'$$,
  $$select created_at, updated_at from role_before$$, 'Dates cannot be forged after role change');

select * from finish();
rollback;
