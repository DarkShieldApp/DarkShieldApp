# Diseño del dominio

HU-14/T1 implementa el perfil y T2 su rol principal persistente. T3 (permisos)
sigue pendiente; estas tareas no completan la historia HU-14.

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
| `role_code`    | `TEXT`          | Obligatorio, default `collaborator`, FK a `roles(code)` con actualización y borrado restringidos        |

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

## Roles de aplicación (HU-14/T2)

`public.roles` es un catálogo de dominio: `code TEXT PRIMARY KEY`, `name TEXT
NOT NULL` y `description TEXT` opcional. El código admite exactamente
`collaborator`, `developer` y `admin`. Los nombres son Colaborador, Desarrollador
y Administrador; no admiten cadenas vacías, solo espacios ni controles.

`profiles.role_code TEXT NOT NULL DEFAULT 'collaborator'` es el séptimo atributo,
con FK a `roles(code)` y `ON UPDATE RESTRICT ON DELETE RESTRICT`. La relación
roles–perfiles es uno a muchos: cada perfil tiene un único rol principal.
La segunda migración siembra el catálogo antes de añadir la columna; los perfiles
anteriores reciben el default sin modificar sus datos ni fechas. El trigger de
Auth sigue insertando solo el UUID: los metadatos no conceden roles. La función
de fechas incluye `role_code` entre los cambios efectivos.

Son roles de aplicación, distintos de los roles PostgreSQL/Supabase o permisos
de GitHub. El consumidor sin cuenta del ConOps no es un cuarto rol persistente.
No hay jerarquía ni exclusión de capacidades: administradores y desarrolladores
podrán colaborar si T3 les concede los permisos correspondientes. Leer el catálogo
o tener un código de rol no autoriza ninguna acción por sí mismo.

RLS y ACL permiten a `authenticated` únicamente leer el catálogo público. `anon`
no tiene acceso; no hay escritura pública sobre roles ni perfiles, ni RPC de
administración. El propietario SQL gestiona las migraciones. T3 definirá la
matriz de permisos, autorización, capacidades acumulativas, cambio administrativo
de roles y auditoría. HU-11 resolverá registro, login, sesiones, cookies y rutas;
HU-10/HU-08 concretarán confianza efectiva, umbrales y validaciones autorizadas.

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

`web/src/server/profiles.ts` exporta `Profile`, `Role` y `RoleCode`. `Profile` refleja la fila persistida:
UUID y fechas son cadenas JSON, confianza es `number` y el nombre es `string | null`.
Son tipos estáticos alineados con las migraciones, no tipos generados ni
validadores de entradas. PostgreSQL es la autoridad de las restricciones.

- **HU-14/T2:** catálogo y rol principal implementados, con integridad y seguridad inicial.
- **HU-14/T3:** permisos y operaciones administrativas controladas.
- **HU-11:** registro, confirmación, acceso, cookies, sesiones y autenticación en Next.js.
- **HU-10:** consulta de confianza y permisos efectivos; cálculo y reglas en las HU relacionadas.
- **HU-05, HU-06, HU-08 y HU-09:** reportes, evidencias, validaciones y credibilidad; futuras relaciones podrán referenciar `profiles.id` sin otra identidad de dominio.

Consultar [arquitectura](architecture.md), [desarrollo](development.md) y
[migraciones y pruebas](../supabase/README.md).

## Consulta de reportes asociados a una página (HU-01)

**Requisito relacionado:** HU-01 — Consultar una página.
**Origen de esta definición:** HU-01, T1 — Definir el flujo de consulta de una página web; ConOps, secciones 4, 5 y 6.
**Estado:** Flujo funcional y criterio de búsqueda definidos para HU-01/T1–T2. La implementación corresponde a HU-01/T3 y T4.

### Propósito y alcance

Permitir que el Usuario Consumidor consulte información sobre posibles _dark patterns_ reportados para una página, y que el Usuario Desarrollador Web consulte reportes relacionados con sus páginas o aplicaciones. La consulta es de solo lectura: no crea ni modifica reportes. Los resultados representan reportes comunitarios sobre posibles patrones, no una confirmación definitiva de que estén presentes.

El ConOps contempla dos puntos de entrada: la Plataforma Web, donde se solicita la consulta, y la Extensión Web, que puede identificar la URL o el dominio visitado, consultar la información y mostrar una alerta o resumen breve con acceso a la plataforma para ampliar información. Para el Sprint 1, HU-01 cubre la consulta desde la web; la integración de la extensión queda fuera del alcance actual (HU-17 permanece en el Backlog). El flujo cubre la presentación del listado resumido; el detalle completo de un reporte queda fuera del Sprint 1 (HU-02).

### Flujo funcional principal

1. El Usuario Consumidor o el Usuario Desarrollador Web accede a la consulta desde la Plataforma Web y proporciona la página que quiere consultar. En el flujo previsto para la Extensión Web, esta obtiene del navegador la URL o el dominio actual y solicita la misma información.
2. El sistema comprueba que la solicitud pueda procesarse y consulta al servidor por los reportes asociados.
3. El servidor recupera la información disponible para esa página y devuelve los resultados que el usuario está autorizado a consultar.
4. Si hay resultados, la Plataforma Web presenta el listado con el resumen acordado para HU-01 y, cuando esté disponible, el estado de credibilidad. La Extensión Web, cuando se implemente, presenta un aviso o resumen breve y ofrece abrir la Plataforma Web para consultar más información.
5. La persona interpreta los resultados como posibles patrones reportados, no como detecciones o validaciones concluyentes. Puede volver al listado o iniciar otra consulta.

El criterio de búsqueda por página o dominio se especifica en HU-01/T2 a continuación. La extensión no debe modificar el contenido ni el funcionamiento de la página visitada.

### Flujos alternativos

| Situación                                                 | Comportamiento esperado                                                                                                                                        |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| La consulta no encuentra reportes                         | Informar que no hay reportes asociados a la página consultada y permitir corregir la entrada o realizar otra búsqueda. No mostrarlo como un error del sistema. |
| La entrada no se puede procesar                           | Explicar que no se pudo consultar esa página y permitir corregir la entrada. La regla concreta de validación se definirá en HU-01/T2.                          |
| La consulta falla o el servidor no responde               | Informar que no se pudo completar la consulta y permitir reintentar. No presentar el fallo como una búsqueda completada sin resultados.                        |
| Hay reportes, pero la credibilidad aún no está disponible | Mostrar la información resumida disponible sin inventar ni inferir un estado de credibilidad.                                                                  |

### Reglas del flujo

- **HU01-FL-01 — Consulta de solo lectura.** La búsqueda no registra, edita ni elimina reportes.
- **HU01-FL-02 — Correspondencia del resultado.** El listado contiene únicamente reportes que correspondan a la página o dominio conforme al criterio de HU-01/T2 y al dato de página afectada que proporcione HU-05.
- **HU01-FL-03 — Diferenciar vacío de error.** Una consulta completada sin coincidencias se distingue de una consulta que no pudo completarse.
- **HU01-FL-04 — Reportes, no detecciones concluyentes.** Los resultados describen posibles _dark patterns_ comunicados mediante reportes. Una consulta, una alerta o la intervención de la IA no confirma por sí sola que el patrón exista.
- **HU01-FL-05 — Resumen en el listado.** La Plataforma Web presenta el resumen previsto para HU-01/T6. La Extensión Web ofrece una alerta o resumen breve con acceso a la Plataforma Web para ampliar información; este canal pertenece a HU-17 y no se implementa en el Sprint 1. El detalle completo no forma parte del alcance del Sprint 1.
- **HU01-FL-06 — Credibilidad dinámica.** Se muestra el estado de credibilidad cuando esté disponible conforme a HU-09. La credibilidad puede cambiar con nuevas evidencias, valoraciones u otra información y no equivale a una decisión definitiva sobre la página.
- **HU01-FL-07 — Acceso y protección.** La consulta sirve al Usuario Consumidor y al Usuario Desarrollador Web, de acuerdo con la información disponible y las reglas de privacidad y acceso. No requiere permisos de colaborador para consultar información pública; los campos que se exponen públicamente y cualquier restricción adicional deben acordarse antes de implementar el acceso.
- **HU01-FL-08 — Uso legítimo y abuso.** La consulta debe seguir disponible para el uso ordinario, con controles proporcionales frente a extracción masiva o abusiva. Los mecanismos concretos no se definen en T1.

### Dependencias y decisiones pendientes

- **HU-05:** proporciona el modelo, el contrato y la visibilidad de los reportes que se consultarán.
- **HU-01/T2:** define los criterios de búsqueda y el contrato de consulta en la sección siguiente.
- **HU-01/T3 y T4:** implementan la consulta del servidor y su interfaz según este flujo.
- **HU-01/T5:** concreta la gestión de páginas sin reportes y de errores de consulta.
- **HU-01/T6 y T7, HU-09:** concretan el resumen y la presentación del estado de credibilidad.
- **ConOps:** identifica al Usuario Consumidor como persona que consulta información y a los Usuarios Desarrolladores Web como consumidores de reportes; la Plataforma Web ofrece la consulta principal y la Extensión Web el acceso contextual durante la navegación.
- **HU-17:** implementará el punto de entrada de la extensión, su resumen/alerta y el enlace a la plataforma. Está fuera del Sprint 1; en esta definición se documenta solo el flujo futuro de interacción.
- **Acceso a la consulta:** concretar qué información del reporte es pública y qué campos requieren protección. La consulta de información pública no debe depender de permisos de colaborador; la autenticación y autorización aplicables a datos restringidos se definirán con HU-11 y las reglas de seguridad.

La documentación de planificación señala que los criterios originales de HU-01 mencionan entrar al detalle de un reporte, mientras que la planificación del Sprint define T6 como mostrar un resumen desde el listado y deja HU-02 fuera del Sprint. Este flujo sigue el alcance planificado para el Sprint; el criterio formal de aceptación debe confirmarse antes de cerrar HU-01.

### HU-01/T2 — Diseño de consulta por página o dominio

**Objetivo:** recuperar de forma explícita y de solo lectura los reportes que correspondan a una página concreta o a un dominio. La búsqueda consulta los datos almacenados en Dark-Shield; no visita ni analiza la página externa.

#### Contrato de solicitud

La propuesta para HU-01/T3 es un `GET /api/reports` con estos parámetros:

| Parámetro | Obligatorio | Contrato |
| --- | --- | --- |
| `target` | Sí | URL de página para `scope=page`; URL o dominio para `scope=domain`. |
| `scope` | Sí | `page` o `domain`. No se infiere para evitar resultados ambiguos. |
| `limit` | No | Entero de 1 a 100; valor predeterminado 20. |
| `cursor` | No | Cursor opaco devuelto por la página anterior para continuar el listado. |

Ejemplos:

```text
GET /api/reports?scope=page&target=https%3A%2F%2Fshop.example.com%2Fpricing
GET /api/reports?scope=domain&target=example.co.uk
```

`scope=page` requiere una URL absoluta `http` o `https`, con host válido y sin credenciales incrustadas. `scope=domain` acepta un dominio o subdominio DNS, o una URL `http`/`https` de la que se extrae el host y se obtiene el dominio registrable; también en este modo se rechazan URLs con credenciales. Otros esquemas, entradas mal formadas, direcciones IP en modo dominio y nombres que sean únicamente un sufijo público se rechazan como entrada inválida. El cliente elimina query y fragmento antes de enviar `target`; el servidor repite la normalización y validación, sin confiar en el cliente. La interpretación de URLs debe seguir el [estándar URL de WHATWG](https://url.spec.whatwg.org/), no expresiones regulares propias.

#### Criterios de correspondencia

- **Búsqueda por página:** se compara esquema, host, puerto efectivo y ruta. La normalización de URL hace equivalentes las mayúsculas/minúsculas del host, los nombres IDN equivalentes y los puertos por defecto. Se conserva la distinción de mayúsculas y la barra final en la ruta.
- Los parámetros de consulta (`?`) y el fragmento (`#`) se excluyen de la clave de búsqueda y se eliminan antes de enviar la solicitud. Así, los identificadores de seguimiento o sesión no fragmentan la consulta ni se transmiten al servidor; rutas cuyo contenido dependa solo de parámetros de consulta no se distinguen en esta versión.
- **Búsqueda por dominio:** se obtiene el dominio registrable usando la [Public Suffix List](https://publicsuffix.org/list/), incluida su sección privada, y se incluyen ese dominio y sus subdominios. La coincidencia debe respetar el límite de etiqueta: `example.com` incluye `shop.example.com`, pero no `notexample.com` ni `example.com.attacker.test`. Esquema, puerto y ruta no limitan la búsqueda por dominio.
- Los sufijos públicos por sí solos (por ejemplo, `co.uk`) no son objetivos válidos. Las direcciones IP solo se admiten en una consulta por página y se comparan como host exacto.

Ejemplos de correspondencia:

| Solicitud | Clave o ámbito resultante |
| --- | --- |
| Página `https://shop.example.com/pricing?campaign=x#plans` | `https://shop.example.com/pricing`; no coincide con `http://shop.example.com/pricing` ni con `/pricing/`. |
| Dominio `blog.shop.example.co.uk` | Dominio registrable `example.co.uk`; incluye sus subdominios, también `shop.example.co.uk`. |
| Dominio `example.com` | Incluye `example.com` y `shop.example.com`; excluye `notexample.com` y `example.com.attacker.test`. |

#### Respuesta y paginación

Una consulta válida devuelve `200 OK` y una colección de resúmenes, sin incluir datos restringidos:

```json
{
  "items": [],
  "nextCursor": null
}
```

Si no hay coincidencias, devuelve `200 OK` con `items: []` y `nextCursor: null`; el cliente lo presenta como estado vacío, no como fallo. Los resultados se ordenan por fecha de creación descendente, con identificador como desempate estable. El cursor es opaco y permite continuar sin cambiar el orden. La proyección concreta de cada resumen corresponde a HU-05 y HU-01/T6; el detalle completo queda fuera de esta consulta.

Una entrada o parámetro inválido devuelve `400 Bad Request` con un código de error estable y un mensaje que permita corregir la solicitud. Errores de autenticación/autorización, límites de uso y fallos del servicio se gestionan según las reglas de acceso y errores de HU-11/HU-01/T5; nunca se convierten en una lista vacía.

#### Integración y decisiones de implementación

- HU-05 debe hacer consultable la página afectada por cada reporte con la clave definida aquí; la forma de persistir y derivar esa clave se resuelve al diseñar el modelo de reportes.
- HU-01/T3 implementa la validación, búsqueda, paginación y proyección; HU-01/T4 consume el contrato desde la interfaz. La extensión seguirá este contrato cuando HU-17 entre en alcance.
- El uso de la Public Suffix List requiere una implementación mantenida y una política para actualizar sus datos; no se debe asumir que los dos últimos componentes separados por puntos identifican siempre el dominio registrable.
- Los límites de página ayudan a acotar respuestas, pero no sustituyen los controles contra extracción masiva previstos por el ConOps.

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
