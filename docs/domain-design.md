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

## Validación e invalidación de reportes

**Requisitos relacionados:** HU-08 (validar o invalidar un reporte), HU-10 (nivel de confianza y permisos) y HU-09 (credibilidad del reporte).
**Origen de esta definición:** HU-08, T1 — Definir el flujo y las reglas de validación e invalidación.
**Estado:** Definición funcional inicial. Las decisiones indicadas como pendientes deberán acordarse antes de implementar las reglas correspondientes.

### Propósito y conceptos

La validación e invalidación permite que los Usuarios Colaboradores autorizados valoren reportes sobre posibles _dark patterns_, contribuyendo a determinar la fiabilidad de la información registrada en Dark-Shield.

De acuerdo con el ConOps:

- **Validar un reporte** significa que el colaborador considera que el comportamiento descrito está presente.
- **Invalidar un reporte** significa que el colaborador considera que el comportamiento descrito no está presente.

Ambas acciones representan valoraciones de la comunidad, no verificaciones definitivas de la veracidad del reporte.

Es necesario distinguir el **nivel de confianza del colaborador**, que puede condicionar su capacidad para participar, del **nivel de credibilidad del reporte**, que refleja su fiabilidad estimada a partir de la información y las valoraciones disponibles.

### Condiciones para realizar una valoración

Para registrar una validación o invalidación, el sistema deberá comprobar que:

1. El usuario está autenticado y puede identificarse como Usuario Colaborador.
2. El usuario dispone de los permisos necesarios para realizar la acción, teniendo en cuenta su rol y su nivel de confianza.
3. El reporte sobre el que se desea actuar existe y puede ser objeto de valoración.
4. La operación cumple las demás restricciones de participación que se acuerden para el proyecto.

El modelo de perfiles existente almacena el nivel de confianza en `trust_level`, con valores enteros entre 1 y 100. Sin embargo, **todavía no se ha definido el umbral mínimo necesario para validar o invalidar reportes**.

El modelo también contempla `is_active` para representar el estado de la cuenta. Su aplicación al control de acceso de estas operaciones deberá concretarse junto con las reglas generales de permisos.

### Flujo funcional

El proceso previsto de validación o invalidación será el siguiente:

1. El Usuario Colaborador accede a un reporte y solicita validarlo o invalidarlo.
2. El sistema recibe la solicitud, identificando la operación y el reporte correspondiente.
3. El servidor comprueba la identidad del usuario y sus permisos efectivos, incluyendo las restricciones asociadas a su nivel de confianza.
4. El sistema verifica que el reporte existe y que la operación cumple las reglas de participación aplicables.
5. Si todas las comprobaciones son satisfactorias, se registra la valoración asociada al usuario y al reporte.
6. La nueva valoración queda disponible para contribuir a la actualización de la credibilidad del reporte, según las reglas definidas para HU-09.
7. El sistema comunica al usuario si la operación se ha completado correctamente.

Si alguna comprobación falla, la operación deberá rechazarse sin registrar una valoración no autorizada o inválida.

### Reglas de negocio

**RV-VAL-01 — Control de autorización.**
Solo podrán validar o invalidar reportes los Usuarios Colaboradores autorizados. Los permisos efectivos deberán determinarse considerando el rol y las condiciones de confianza correspondientes. El servidor será responsable de aplicar estas restricciones, independientemente de los controles visibles en la interfaz.

**RV-VAL-02 — Tipos de valoración.**
Cada operación de valoración deberá identificar si el colaborador desea validar o invalidar el reporte. Ambas acciones deben diferenciarse de forma inequívoca.

**RV-VAL-03 — Asociación y persistencia.**
Toda valoración registrada correctamente deberá quedar asociada al usuario que la emite y al reporte al que se refiere. La información deberá conservarse de forma persistente y poder recuperarse posteriormente.

**RV-VAL-04 — Integración con la credibilidad.**
Las nuevas valoraciones deberán tenerse en cuenta al actualizar la credibilidad del reporte. Esta actualización dependerá de las reglas acordadas para HU-09 y no implicará que una única validación o invalidación determine automáticamente la veracidad del reporte.

**RV-VAL-05 — Protección frente a operaciones no autorizadas.**
Una solicitud que no cumpla las condiciones de autorización deberá rechazarse sin crear ni modificar valoraciones. La comprobación deberá realizarse en el servidor, aunque la interfaz también informe al usuario sobre las acciones que tiene permitidas.

### Situaciones alternativas y errores

Se contemplan las siguientes situaciones durante el proceso:

| Situación                          | Comportamiento esperado                                                                           |
| ---------------------------------- | ------------------------------------------------------------------------------------------------- |
| Usuario no autenticado             | Rechazar la operación porque no se puede identificar a un colaborador autorizado.                 |
| Usuario sin permisos suficientes   | Rechazar la operación sin registrar la valoración.                                                |
| Reporte inexistente                | Informar del error sin registrar una valoración asociada a un reporte inválido.                   |
| Solicitud de valoración incorrecta | Rechazar los datos que no representen una operación válida.                                       |
| Fallo durante el almacenamiento    | No comunicar que la operación ha tenido éxito si la valoración no se ha registrado correctamente. |

La forma concreta de comunicar estos errores mediante la API y la interfaz se definirá durante la implementación de HU-08.

### Dependencias con otras funcionalidades

La validación e invalidación depende de funcionalidades desarrolladas en otras historias de usuario:

- **HU-14 y HU-11:** proporcionan la identidad, los roles y los mecanismos de autenticación necesarios para identificar al colaborador.
- **HU-05:** proporciona los reportes sobre los que se realizan las valoraciones.
- **HU-10:** permite establecer y consultar las condiciones de confianza y los permisos efectivos.
- **HU-09:** utiliza las valoraciones registradas como uno de los factores que intervienen en la credibilidad del reporte.

Los contratos de integración deberán acordarse con los responsables de estas funcionalidades antes de implementar sus dependencias.

### Decisiones pendientes

Los documentos de requisitos no concretan completamente las siguientes reglas:

1. **Nivel mínimo de confianza:** establecer qué condiciones de `trust_level` y permisos permiten validar o invalidar.
2. **Valoraciones repetidas:** decidir si un colaborador puede valorar varias veces un mismo reporte y cómo se gestionan los intentos duplicados.
3. **Cambio o retirada de valoración:** determinar si una valoración puede modificarse o eliminarse después de registrarla.
4. **Valoraciones sobre reportes propios:** el ConOps describe la participación sobre reportes de otros usuarios; debe concretarse cómo se aplica esta restricción y si existen excepciones.
5. **Restricciones según el estado del reporte:** decidir si existen estados que impidan recibir nuevas valoraciones.
6. **Actualización de credibilidad:** establecer el contrato con HU-09, incluida la forma en la que una nueva valoración desencadena o alimenta el recálculo.

Estas decisiones deberán acordarse antes de implementar los comportamientos afectados. Hasta entonces, no se consideran reglas definitivas del sistema.

### Comprobación del comportamiento esperado

La implementación posterior deberá permitir verificar, como mínimo, que:

- Un Usuario Colaborador autorizado puede registrar una validación o invalidación sobre un reporte válido.
- Una valoración registrada queda asociada al usuario y al reporte y puede recuperarse de forma persistente.
- Un usuario sin permisos suficientes no puede registrar una valoración.
- Una nueva valoración se tiene en cuenta en el proceso de actualización de la credibilidad del reporte.

Estas comprobaciones derivan de los criterios de aceptación de HU-08 y servirán de referencia para las pruebas posteriores.
