# Supabase

Supabase es la base de datos acordada. Se recomienda usar también Supabase Auth
para HU-11 y evaluar Storage para las evidencias de HU-06.

Este directorio reserva `migrations/` para los futuros cambios SQL. No contiene
tablas, políticas, datos de prueba ni configuración de un proyecto remoto. Tampoco
se ha inicializado la CLI: el esqueleto arranca sin Supabase ni Docker.

Al abordar las historias correspondientes:

1. Acordar usuarios/perfiles, roles y contratos antes de construir las funciones
   que dependen de ellos. Si se adopta Auth, referenciar su identidad; evitar crear
   un segundo sistema de contraseñas.
2. Versionar cada cambio SQL en `migrations/` y las políticas RLS en la misma
   migración que crea las tablas expuestas. Verificar accesos autorizados y denegados.
3. Para evidencias, decidir buckets, límites y políticas de acceso; no hacer públicos
   todos los archivos por defecto.
4. Inicializar la CLI y acordar el flujo de migraciones cuando se configure el
   proyecto. Aplicarlas a un entorno de desarrollo antes de compartirlas.

Las claves publicables no sustituyen las políticas RLS. Las claves secretas y
`service_role` eluden RLS y deben limitarse al servidor y a operaciones que realmente
las necesiten. La extensión utilizará la API de la web para las operaciones de negocio.

Referencias: [claves](https://supabase.com/docs/guides/api/api-keys),
[RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) y
[migraciones](https://supabase.com/docs/guides/deployment/database-migrations).
