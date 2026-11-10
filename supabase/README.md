# Supabase

Supabase / PostgreSQL y Supabase Auth son las tecnologías adoptadas. Esta
preparación transversal aporta factorías web sin estado, diagnóstico manual de
Auth y CLI reproducible. No implementa HU-14/T1 ni HU-11, tablas de aplicación,
políticas RLS, registro, login, logout o sesiones.

## Proyecto remoto y diagnóstico

El proyecto remoto se crea manualmente. Su URL y clave publicable se guardan en
`web/.env`, partiendo de `web/.env.example` sin sobrescribir un archivo existente.
No se usan claves administrativas, contraseñas PostgreSQL ni credenciales en Git.
Las claves públicas no sustituyen autorización ni políticas RLS.

Desde la raíz, `npm run supabase:check` carga explícitamente `web/.env` y hace un
GET de solo lectura a `/auth/v1/health`. Un resultado correcto únicamente acredita
la disponibilidad del servicio Auth; no prueba PostgreSQL ni el modelo de datos.
No crea usuarios ni sesiones. Nunca se ejecuta automáticamente en CI o build.
Los detalles, errores y límites están en [desarrollo](../docs/development.md).

## Instancia local aislada

`supabase` 3.1.0 es una dependencia de desarrollo de la raíz, fijada en el lockfile.
`config.toml` se inicializó con esa CLI y se redujo a los servicios necesarios:
PostgreSQL, API, Auth, Studio y correo local. Storage, Realtime, Edge Functions y
Analytics están desactivados. No hay seeds ni migraciones de aplicación.
El registro local está deshabilitado hasta diseñar HU-11.

Requisitos: Node.js 24, npm 11 o 12, Docker con motor Linux activo y puertos
54320–54324 disponibles. Ejecutar desde la raíz:

```sh
npm ci
npm run supabase:start
npm run supabase:status
npm run supabase:stop
```

La CLI descarga imágenes la primera vez. `start` trabaja únicamente con servicios
locales del proyecto `darkshield`; no necesita login ni enlazar un proyecto remoto.
La API local usa `http://127.0.0.1:54321`, PostgreSQL el puerto 54322 y Studio el 54323. `stop` conserva los datos locales; no usar opciones de borrado para el
trabajo ordinario. La CLI puede mostrar claves y cadenas de conexión locales en
su salida: no copiar esa salida a Git, incidencias o logs compartidos. Tampoco
exportar sus claves privilegiadas a variables `NEXT_PUBLIC_`.

PostgreSQL 17 es el valor local de partida de la CLI. Antes de la primera migración,
confirmar la versión mayor del remoto y alinear esta configuración si corresponde.
La configuración local no altera la configuración del proyecto remoto. No se ha
ejecutado `link`, `db push`, `db pull`, `db reset` ni cambios de esquema remotos.

En la preparación del 10/11/2026 el motor Docker no estaba disponible. Se verificó
la versión de CLI y se generó su configuración; `supabase start` falló al conectar
con el motor Docker. Por tanto, **no se ha probado una
instancia PostgreSQL local ni SQL/RLS**. La web y las pruebas unitarias funcionan
sin Docker.

## Próximas migraciones y pruebas SQL/RLS

HU-14/T1 incorporará la primera migración de perfiles y sus políticas RLS en
`migrations/`, conservando la identidad de Supabase Auth. No crear un segundo
sistema de contraseñas. Las tablas expuestas deben incluir sus políticas en la
misma migración y pruebas de acceso permitido y denegado.

Cuando existan esas migraciones, ampliar CI con un job aislado de Supabase local
sobre el Docker del runner: instalar con `npm ci`, iniciar los servicios locales,
aplicar y verificar las migraciones locales, ejecutar `npm exec -- supabase test db`
con pruebas pgTAP/SQL en `supabase/tests/` y detener los servicios incluso tras
fallos. Verificar expresamente usuarios anónimos, propietarios y otros usuarios
según el modelo acordado. Ese job no debe enlazarse al proyecto compartido ni
utilizar sus secretos. Todavía no hay pruebas SQL que ejecutar ni se añade un
paso vacío que aparente validarlas.

HU-11 resolverá registro, acceso, cierre de sesión, cookies SSR, verificación de
identidad, renovación y protección de rutas. La extensión utilizará la API web.
Storage y políticas de evidencias se evaluarán en HU-06.

Referencias: [CLI](https://supabase.com/docs/guides/local-development/cli/getting-started),
[migraciones](https://supabase.com/docs/guides/deployment/database-migrations),
[RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) y
[pruebas de base de datos](https://supabase.com/docs/guides/local-development/testing/overview).
