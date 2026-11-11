# Supabase

Supabase/PostgreSQL y Supabase Auth son las tecnologías adoptadas. HU-14/T1
incorpora `public.profiles`, su primera migración, triggers, RLS y pruebas reales.
T2 añade `public.roles` y un rol principal obligatorio por perfil.
Las factorías web siguen sin estado. Registro, login, logout, cookies y sesiones
pertenecen a HU-11 y todavía no están implementados.

## Proyecto remoto y diagnóstico

La URL y clave publicable del proyecto compartido se guardan en `web/.env`,
partiendo de `web/.env.example` sin sobrescribir un archivo existente. No se usan
claves administrativas ni contraseñas remotas en código o Git.

`npm run supabase:check` carga explícitamente `web/.env` y consulta solo
`/auth/v1/health`. Su resultado demuestra disponibilidad de Auth, no el modelo ni
RLS. No crea usuarios ni sesiones y no se ejecuta en CI o build.

Las migraciones de T1/T2 están versionadas para validación local. Esta tarea no
las aplica al proyecto remoto compartido; su estado debe comprobarse antes del despliegue. El remoto utiliza PostgreSQL 17.

## Instancia local y migraciones

Supabase CLI 3.1.0 es una dependencia fijada en el lockfile. La configuración
local usa PostgreSQL 17, API, Auth, Studio y correo local. Storage, Realtime,
Edge Functions y Analytics están desactivados, al igual que el registro público.
No hay archivos seed; los tres roles se siembran en la propia migración T2. La CLI v3 usa el entorno local por defecto; los comandos de esta
sección no llevan `--remote` y no necesitan login ni enlazar el proyecto remoto.

Requisitos: Node.js 24, npm 11 o 12, Docker con motor Linux y puertos 54320–54324
libres. Ejecutar desde la raíz:

```sh
npm ci
npm run supabase:start
npm exec -- supabase migration up
npm exec -- supabase migration list
npm run test:db
npm run supabase:stop
```

En una instancia nueva, `start` inicializa el esquema de Supabase y aplica las
migraciones del repositorio. Si ya existe una instancia con datos, `migration up`
aplica únicamente las pendientes. No utilizar `db reset` sobre datos que deban
conservarse. `stop` conserva los volúmenes; no usar `--no-backup` ni `--all` para
el trabajo ordinario.

La CLI descarga imágenes la primera vez. La API local está en
`http://127.0.0.1:54321`, PostgreSQL en 54322 y Studio en 54323. `start` y `status`
pueden imprimir claves locales: no copiar su salida a Git, incidencias ni logs
compartidos. Tampoco exportar claves privilegiadas a `NEXT_PUBLIC_`.

Para reproducir el job de CI sin servicios visuales ni correo:

```sh
npm exec -- supabase start --exclude studio,postgres-meta,mailpit
npm run test:db
npm exec -- supabase stop
```

## Migración de perfiles

`migrations/20261110154948_create_profiles.sql`, creada con `supabase migration
new create_profiles`, define:

- `public.profiles`, seis atributos originales (siete después de T2) y sus restricciones, con UUID compartido y FK
  `ON DELETE RESTRICT` a `auth.users`.
- `private.create_profile_for_auth_user()`, invocada después de insertar en Auth,
  que crea un perfil con valores predeterminados sin copiar metadatos.
- Backfill de las identidades existentes. El trigger se instala antes del backfill;
  la PK y `ON CONFLICT (id) DO NOTHING` impiden duplicar perfiles.
- `private.set_profile_updated_at()`, que preserva `created_at` y actualiza
  `updated_at` solo cuando cambian los datos del perfil.
- RLS explícita y permiso `SELECT` a `authenticated` limitado al perfil propio
  activo. Sin escritura pública ni acceso anónimo o administrativo por API.

La función de creación es `SECURITY DEFINER` para permitir que Auth cree el perfil
sin concederle acceso general a la tabla. Ambas funciones tienen `search_path`
vacío y ejecución pública revocada; `private` no figura en `api.schemas`. La
función de fechas es `SECURITY INVOKER`. El trigger de Auth propaga errores y
revierte la inserción de identidad si no puede crear su perfil.

La migración revoca explícitamente los posibles grants por defecto, incluidos
los de `service_role`, y concede solo lo necesario. No depende de que la exposición
automática de tablas esté habilitada. Futuras migraciones deben conceder permisos
y políticas de manera explícita y probarlos conjuntamente, sin habilitar RPC
privilegiadas como atajo. Si se amplía `profiles`, revisar también qué cambios
requieren actualizar la fecha y el tipo TypeScript.

El [diseño de dominio](../docs/domain-design.md) describe atributos, límite de
conversión de decimales a `SMALLINT`, desactivación, preservación de identidades y
consecuencias de la FK ante necesidades excepcionales de eliminación. La política
sobre perfiles no revoca sesiones ni protege futuras tablas y endpoints.

## Migración de roles

`migrations/20261111113011_create_roles.sql`, generada mediante `supabase migration
new create_roles`, añade el catálogo con PK textual y CHECK de los tres códigos:
`collaborator` (Colaborador), `developer` (Desarrollador), `admin` (Administrador).
El nombre es obligatorio, de 1–80 caracteres, sin controles y no solo espacios;
la descripción es texto opcional. No crea identidades ni cuentas administrativas.

Primero siembra el catálogo y después añade `profiles.role_code TEXT NOT NULL
DEFAULT 'collaborator'` con FK `ON UPDATE RESTRICT ON DELETE RESTRICT`. PostgreSQL
17 aplica el default constante también a filas anteriores, sin reescribir sus
atributos o disparar UPDATE. La función de fechas se reemplaza para comparar
además `role_code`, manteniendo invocador, search_path vacío y ACL privadas.
El trigger de alta Auth permanece intacto y no lee roles de metadatos.

El catálogo tiene RLS explícita; se revocan los grants de `PUBLIC`, `anon`,
`authenticated` y `service_role`, concediendo solo SELECT a `authenticated`
con política explícita. La política del perfil propio activo no cambia y no hay
escrituras públicas, ni de tabla ni de columna. Leer roles no concede capacidades.
T3 definirá permisos, capacidades acumulativas, cambio administrativo y auditoría;
HU-11 resolverá sesiones. El consumidor sin cuenta no es un rol persistente.

## Pruebas PostgreSQL y RLS

`npm run test:db` ejecuta `supabase test db` con pgTAP sobre la instancia local.
La CLI prepara pgTAP; no se añaden dependencias al esquema de aplicación.

- `profiles_model.test.sql`: columnas, restricciones, creación automática,
  metadatos ignorados, valores límite, fechas, FK conservadora y rollback ante
  un fallo de creación.
- `profiles_rls.test.sql`: ACL de tabla/columnas, funciones privadas y consultas
  como `anon` y `authenticated` con `SET LOCAL ROLE` y `request.jwt.claims`.
  Comprueba identidad propia/ajena/ausente, cuenta inactiva y escrituras denegadas.
  Con grants temporales comprueba además la protección independiente de RLS.
- `profiles_backfill.test.sql`: reconstruye transaccionalmente el estado previo
  a perfiles y reproduce el SQL exacto guardado por la CLI en
  `supabase_migrations.schema_migrations`; prueba identidades preexistentes y
  posteriores. No mantiene una copia paralela de la migración.

- `roles_model.test.sql`: catálogo exacto, integridad, defaults, metadatos ignorados,
  FK conservadora y fechas ante cambio de rol, no-op e intento de falsificación.
- `roles_rls.test.sql`: lectura autenticada, denegación anónima, ACL de tabla y
  columna, escrituras y autopromoción denegadas; grants temporales aíslan RLS.
- `roles_backfill.test.sql`: restaura transaccionalmente el esquema T1 y reproduce
  T2 desde el historial real; verifica preservación de atributos y fechas y el
  default para perfiles existentes. La prueba histórica de T1 sigue funcionando:
  al eliminar profiles desaparece su FK saliente y roles permanece sin conflicto.

Cada archivo usa `BEGIN`/`ROLLBACK`, UUID propios y un plan pgTAP; datos, DDL y
grants temporales desaparecen al finalizar o abortar la conexión. Estas pruebas
son exclusivamente para instancias locales aisladas: la prueba de backfill toma
bloqueos DDL y no debe ejecutarse en un entorno compartido. Al introducir futuras
relaciones, mantener esta prueba de transición o adaptarla para cubrir la nueva
secuencia de migraciones. Los resultados SQL son independientes de la cobertura
V8 de TypeScript.

Comprobaciones adicionales locales:

```sh
npm exec -- supabase db lint --schema public,private --fail-on warning
npm exec -- supabase db advisors --type security --fail-on error
```

Consultar `--help` al actualizar la CLI. La CLI 3 ya no necesita `--local` para
estos comandos. No confundir un asesor del remoto sin migrar con la revisión del
esquema local de T1/T2.

## Integración continua y despliegue posterior

El job `database` de `.github/workflows/ci.yml` usa Node 24, npm 12.2.1 y la CLI del
lockfile. Verifica que existen migraciones y pruebas, inicia Supabase en el Docker
del runner con una base nueva, aplica las migraciones mediante `start` y ejecuta
pgTAP. Un error de arranque, SQL o pruebas falla el job. `always()` detiene los
servicios incluso tras fallos. La salida del arranque se guarda en un archivo
temporal del runner para no publicar claves locales. No se conecta al remoto,
no utiliza secretos ni oculta fallos con `continue-on-error`.

El despliegue remoto se realizará posteriormente por el procedimiento acordado
por el equipo: revisar SQL y diff, superar CI y revisión humana, confirmar el
proyecto y su historial, comprobar identidades preexistentes y respaldo, y aplicar
las migraciones versionadas en orden con una identidad autorizada. Verificar después historial,
triggers, RLS y asesores. No sustituirlo por cambios manuales en el SQL Editor;
los cambios posteriores deben quedar en nuevas migraciones. T1/T2 no incluyen ese
despliegue ni modificaciones administrativas de Auth remoto.

Referencias oficiales: [datos de usuario y triggers](https://supabase.com/docs/guides/auth/managing-user-data),
[RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[pgTAP](https://supabase.com/docs/guides/local-development/testing/pgtap-extended) y
[cambios de CLI v3](https://supabase.com/changelog/supabase-cli-v3).
