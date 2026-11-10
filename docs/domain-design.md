# Diseño del dominio

HU-14/T1 define e implementa el perfil de usuario. Las restantes entidades se
diseñarán al abordar sus historias; T1 no completa la historia HU-14.

## Identidad y perfil

Supabase Auth gestiona la identidad en `auth.users`. `public.profiles` representa
al usuario de Dark-Shield mediante una relación 1:1 con el mismo UUID. No duplica
correo, contraseña, sesión ni metadatos internos de Auth.

| Atributo       | Tipo PostgreSQL | Contrato                                                                                                |
| -------------- | --------------- | ------------------------------------------------------------------------------------------------------- |
| `id`           | `UUID`          | PK, FK a `auth.users(id)`, sin generador propio                                                         |
| `display_name` | `TEXT`          | Opcional; 1–80 caracteres si está presente, al menos uno que no sea espacio y sin caracteres de control |
| `trust_level`  | `SMALLINT`      | Obligatorio, inicial 1, intervalo inclusivo 1–100                                                       |
| `is_active`    | `BOOLEAN`       | Obligatorio, inicialmente `TRUE`                                                                        |
| `created_at`   | `TIMESTAMPTZ`   | Obligatorio, `now()` al insertar, preservado al actualizar                                              |
| `updated_at`   | `TIMESTAMPTZ`   | Obligatorio, `now()` al insertar; reloj real al cambiar datos del perfil                                |

Un `AFTER INSERT` en `auth.users` crea exactamente un perfil usando solo el UUID.
La migración también incorpora perfiles para las identidades existentes. La PK
impide duplicados y la FK impide perfiles huérfanos. Un fallo del trigger aborta
la inserción de identidad dentro de la misma transacción; no se oculta ni se deja
una cuenta sin perfil. No depende de pantallas de registro ni copia metadatos
aportados por el usuario. El registro público local sigue desactivado hasta HU-11.

El trigger de fechas compara los campos del perfil con `IS DISTINCT FROM`, por
lo que detecta también cambios desde/hacia `NULL`. Un `UPDATE` sin cambios reales
mantiene `updated_at`; una modificación solo de fechas tampoco altera las fechas.
Se usa `clock_timestamp()` al cambiar datos para reflejar cambios sucesivos dentro
de una misma transacción, donde `now()` permanece constante.

## Confianza y estado de cuenta

`trust_level` representa confianza persistida, sin algoritmo de cálculo ni reglas
de permisos. SQL rechaza 0, negativos, valores mayores que 100 y `NULL`. El tipo
almacena enteros; una entrada textual como `'1.5'` se rechaza. PostgreSQL puede
redondear una expresión `numeric` antes de convertirla a `SMALLINT` (por ejemplo,
`1.5::smallint` resulta 2), antes de ejecutar checks o triggers. Las futuras
operaciones controladas deben validar que su entrada sea entera **antes** de la
conversión. T1 no habilita ninguna escritura pública, decimal o entera.

`is_active = FALSE` indica desactivación lógica: mantiene identidad, perfil y
futuras relaciones para trazabilidad. La FK usa `ON DELETE RESTRICT`; borrar
físicamente una identidad que tenga perfil falla, incluso desde operaciones
administrativas de Auth. No se incorpora ninguna operación de eliminación.
Una eventual anonimización o eliminación legal exige un procedimiento separado,
revisado y autorizado, que considere las futuras referencias, la retención y los
datos de Auth. No se debe cambiar a cascada ni deshabilitar restricciones como
atajo para ese procedimiento.

Desactivar el perfil **no revoca sesiones de Supabase Auth**. HU-11 y la gestión
de permisos deberán coordinar revocación y autorización. Todas las futuras
tablas y endpoints deben comprobar `is_active` según sus requisitos: la política
de perfiles no protege automáticamente el resto del sistema.

## Acceso inicial

RLS está habilitada explícitamente. Solo `authenticated` recibe `SELECT`, y su
única política exige `(select auth.uid()) = id AND is_active`. Un usuario activo
solo ve su perfil; otro usuario, una identidad sin `sub` o una cuenta desactivada
no ven esa fila. `anon` carece de permiso de lectura.

Los roles públicos no tienen escritura, eliminación ni truncado. Se revocan
los posibles permisos predeterminados de `PUBLIC`, `anon`, `authenticated` y
`service_role`; no se habilitan operaciones administrativas por API en T1.
La función de creación necesita `SECURITY DEFINER` porque el rol interno de Auth
no puede insertar perfiles. Está en `private`, fuera de los esquemas de la API,
con `search_path` vacío, referencias cualificadas, sin argumentos ni SQL dinámico
y sin permisos públicos de ejecución. El trigger de fechas usa `SECURITY INVOKER`.
El propietario SQL conserva las capacidades necesarias para migraciones; RLS no
es una barrera contra el propietario ni contra superusuarios.

## Representación TypeScript y dependencias

`web/src/server/profiles.ts` exporta `Profile`, que refleja la fila persistida:
UUID y fechas son cadenas JSON, confianza es `number` y el nombre es `string | null`.
Es un tipo estático escrito a partir de esta migración, no tipos generados ni un
validador de entradas. PostgreSQL es la autoridad de las restricciones.

- **HU-14/T2:** creación y asignación de roles, todavía sin tablas ni relaciones.
- **HU-14/T3:** permisos y operaciones administrativas controladas.
- **HU-11:** registro, confirmación, acceso, cookies, sesiones y autenticación en Next.js.
- **HU-10:** consulta de confianza y permisos efectivos; cálculo y reglas en las HU relacionadas.
- **HU-05, HU-06, HU-08 y HU-09:** reportes, evidencias, validaciones y credibilidad; futuras relaciones podrán referenciar `profiles.id` sin otra identidad de dominio.

Consultar [arquitectura](architecture.md), [desarrollo](development.md) y
[migraciones y pruebas](../supabase/README.md).
