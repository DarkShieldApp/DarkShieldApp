# Desarrollo del proyecto

> Estado: guía de desarrollo del Sprint 1 (9-22 de noviembre de 2026), con infraestructura y entidad persistente de usuario HU-14/T1. Las restantes tareas de HU-14 y HU-11 siguen pendientes.

## Puesta en marcha y organización

El repositorio tiene dos _workspaces_ npm: `web/` (`@darkshield/web`) y `extension/` (`@darkshield/extension`), con un solo `package-lock.json` en la raíz. Se utiliza **Node.js 24.x**, **npm 11 o 12**, TypeScript estricto, ESLint y Prettier. El detalle de instalación, comandos y carga local de la extensión ya está explicado en el [README](../README.md) y no se repite aquí.

Para instalar dependencias se usa `npm ci`. Los comandos principales son `npm run dev:web`, `npm run dev:extension` y `npm run check` (formato, lint, tipos y compilación). Al instalar una dependencia específica de una aplicación, usar su _workspace_ y conservar el lockfile único.

La integración web consume `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
al crear un cliente. Copiar `web/.env.example` a `web/.env` únicamente si no existe;
completarla desde el proyecto creado manualmente. La extensión no consume Supabase.
Los archivos de entorno locales deben quedar fuera del control de versiones. Las
variables `NEXT_PUBLIC_` son visibles para el cliente; **no son un lugar para claves
secretas**. Next.js fija esos valores en el bundle al compilar: un futuro despliegue
que utilice el cliente requiere configurarlos antes del build. La página inicial,
las importaciones y las pruebas no requieren configuración real.

### Clientes Supabase

```ts
// Dentro de un Client Component ("use client"), al necesitar el servicio:
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
// const supabase = createBrowserSupabaseClient();
```

```ts
// Dentro de un Server Component, Route Handler o Server Action:
import { createServerSupabaseClient } from '@/server/supabase';
// const supabase = createServerSupabaseClient();
```

Invocar dentro de la función que realiza la operación, nunca en el nivel superior
del módulo. Cada llamada valida las variables y crea una instancia independiente.
`config.ts` exige un origen HTTPS (HTTP solo para loopback local), sin rutas,
credenciales, consulta ni fragmento, y una clave de formato `sb_publishable_...`.
Rechaza claves secretas y JWT heredados; no verifica criptográficamente la clave
ni que corresponda al proyecto. Los errores identifican la variable sin mostrar
su valor. No hay cliente privilegiado.

`client-only` y `server-only` delimitan los módulos para Next.js. Las factorías
usan `@supabase/supabase-js` con `persistSession`, `autoRefreshToken` y
`detectSessionInUrl` desactivados. No transportan identidad del usuario ni leen
cookies: no deben usarse como autorización. HU-11 sustituirá esta preparación
sin estado por las utilidades de `@supabase/ssr` para App Router y resolverá el
flujo completo de cookies, validación y renovación. El
[cliente SSR de Supabase](https://github.com/supabase/ssr/blob/main/src/createBrowserClient.ts)
persiste sesiones mediante cookies; por eso no se instala anticipadamente.
No hay Auth Helpers ni `proxy.ts`. La extensión seguirá utilizando la API web.

### Diagnóstico manual de conectividad

Desde la raíz: `npm run supabase:check`. Node.js 24 carga explícitamente `web/.env`
con `loadEnvFile`, usando una ruta relativa al script. Las variables ya exportadas
en el proceso tienen prioridad; `.env.local` no se carga en este comando. No se
modifica ningún archivo de entorno. No se ejecuta en tests, build ni CI.

Realiza un único `GET /auth/v1/health` con la clave publicable en la cabecera
`apikey`, timeout de diez segundos y redirecciones deshabilitadas. Comprueba
HTTP satisfactorio y JSON identificando GoTrue con versión. Distingue errores de
configuración/acceso, red, estado HTTP y contenido inesperado; falla con salida
no cero. No muestra URL, claves, cuerpo remoto ni excepciones sin filtrar.
No crea usuarios, sesiones ni registros. **Solo demuestra que Auth responde**;
no acredita conexión SQL, tablas, RLS ni flujos de autenticación.
El endpoint está descrito en la
[documentación oficial de diagnóstico](https://supabase.com/kb/troubleshooting/how-do-i-check-gotrueapi-version-of-a-supabase-project-lQAnOR).

### Pruebas y cobertura

Ejecutar desde la raíz:

```sh
npm test
npm run test:coverage
npm run test:db # requiere Supabase local iniciado
```

El workspace web ofrece los mismos scripts (`npm run test --workspace @darkshield/web`).
Vitest 5.1.0 ejecuta en modo no interactivo con entorno Node; ninguna prueba usa
credenciales reales. Se prueban la validación, las factorías con el SDK real
(observando sus argumentos), la ausencia de red/sesiones al inicializar y el
diagnóstico con respuestas HTTP controladas. Solo los marcadores de Next.js se
sustituyen por módulos vacíos en las pruebas de clientes, porque Vitest no es el
compilador de Next.js.

La cobertura V8 incluye **todos los `.ts` de `web/src/lib/`, `web/src/server/` y
`web/scripts/lib/`**, también si no los importa ninguna prueba; excluye únicamente
declaraciones `.d.ts` dentro de ese ámbito. Actualmente son:

- `src/lib/supabase/config.ts`: validación y lectura diferida del entorno.
- `src/lib/supabase/client.ts`: factoría del navegador.
- `src/server/supabase.ts`: factoría del servidor.
- `scripts/lib/auth-health.ts`: petición y clasificación del diagnóstico.

`src/server/profiles.ts` contiene únicamente el tipo `Profile`; no tiene lógica
ejecutable ni necesita pruebas Vitest ficticias. Permanece en el ámbito de
cobertura: V8 omite su archivo vacío tras eliminar los tipos. Las restricciones
del perfil se prueban en PostgreSQL, sin atribuirles cobertura V8.

Se exige **80 % por archivo en líneas, sentencias, ramas y funciones**; una cifra
inferior falla. Los tests, configuraciones, documentación, pantallas de arranque
y el lanzador de consola `scripts/check-supabase.ts` quedan fuera del ámbito; este
último carga el archivo, llama a código medido y establece la salida del proceso.
No se atribuye esta cobertura al producto completo ni a historias no implementadas.
Informes ignorados por Git: `web/coverage/index.html`, `lcov.info` y
`coverage-summary.json`. Una suite web sin pruebas falla; no se usa `passWithNoTests`.

Los comandos raíz ejecutan obligatoriamente web y después los scripts de extensión
cuando existan (`--if-present` solo en extensión). Al incorporar comportamiento
a la extensión, añadir allí Vitest, scripts `test` y `test:coverage`, pruebas y
umbrales equivalentes; los fallos se propagarán a la raíz. Al introducir rutas,
componentes funcionales o módulos `.tsx`, ampliar expresamente el ámbito de
cobertura y añadir las pruebas correspondientes. No mover ni excluir negocio
para eludir el umbral. Esta regla concreta el objetivo de la DoD para la
infraestructura actual y deberá revisarse con cada ampliación funcional.

## Flujo de trabajo y calidad

- Cada historia de usuario (HU) tiene tareas, criterios de aceptación y dependencias. La selección y seguimiento del Sprint se gestiona en ClickUp; este documento solo orienta la implementación técnica.
- Acordar el contrato entre componentes antes de desarrollar funcionalidades dependientes. Mantener pequeñas y revisables las contribuciones mediante _pull requests_.
- El trabajo se considera completado después de superar sus criterios de aceptación y **revisión independiente**: la persona revisora no debe ser quien haya implementado la historia.
- Incorporar pruebas reales conforme aparezca código de negocio: unitarias, integración y las funcionales necesarias. Las prácticas contemplan TDD y un objetivo de **80 % de cobertura** dentro de la definición de terminado (DoD); se deberá precisar qué código se incluye en la medición. No atribuir cobertura a pantallas vacías.
- No añadir datos simulados, endpoints de muestra o pruebas ficticias solo para dar apariencia de funcionalidad. Las decisiones técnicas y riesgos relevantes se documentan en los [ADR](adr/0001-repository-and-typescript.md) o en las tareas que los motivan.

### Migraciones, perfiles y comprobaciones

`web/src/server/profiles.ts` representa la fila de `public.profiles`. En futuros
módulos del servidor:

```ts
import type { Profile } from '@/server/profiles';
```

Sus fechas y UUID son cadenas JSON; el tipo no valida entradas en tiempo de
ejecución ni proporciona autenticación. Mantenerlo alineado con las migraciones.
No se han modificado las factorías para introducir sesiones o un cliente privilegiado.

La [guía de Supabase](../supabase/README.md) describe cómo iniciar la instancia,
aplicar migraciones pendientes sin borrar datos, ejecutar pgTAP y revisar los
asesores locales. La suite incluye perfiles nuevos y preexistentes, integridad,
fechas, rollback y RLS bajo roles reales. Cada prueba revierte sus datos y DDL.
No ejecutar esta suite en un entorno compartido.

`.github/workflows/ci.yml` conserva el job `check`: `npm ci`, `npm run check` y
`npm run test:coverage`. Añade `database`, que comprueba la presencia de SQL,
inicia Supabase con PostgreSQL 17 sobre el Docker del runner, aplica las
migraciones y ejecuta `npm run test:db`. Detiene los servicios con `always()`.
Los fallos se propagan; no se utiliza `continue-on-error` ni se necesitan secretos.
Ambos jobs se ejecutan en push a `main` y PR dirigidas a `main`, con Node.js 24,
npm 12.2.1, permisos `contents: read` y acciones fijadas por SHA.

La validación local no sustituye la ejecución efectiva en GitHub tras publicar
la rama, ni la revisión humana independiente. La migración remota se gestionará
por separado: revisar SQL e historial, comprobar respaldo e identidades existentes,
aplicar el archivo versionado por el procedimiento autorizado y verificar después
RLS y asesores. No resolver diferencias mediante SQL manual fuera del historial.

### Dependencias de herramientas

Las versiones exactas se encuentran en los `package.json` y el lockfile; en el esqueleto se fijaron TypeScript 5.9.3 y ESLint 9.39.5 para mantener la compatibilidad con la cadena de plugins utilizada. La auditoría inicial consignó ocho avisos moderados en dependencias de desarrollo relacionados con `minimatch`, y ninguno en la ejecución realizada con `npm audit --omit=dev`. No se ejecutó `npm audit fix --force` porque proponía retrocesos incompatibles. **Estos resultados son históricos, no una auditoría nueva ni una garantía de seguridad.** Revisar [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) y compatibilidad con ESLint 10 en las futuras actualizaciones.

En la validación del 10/11/2026, `npm audit` informa de siete avisos moderados
en la cadena `typescript-eslint` / `minimatch`, y `npm audit --omit=dev` de cero.
La instalación también avisa de que ESLint 9.39.5 ya no recibe soporte. No se
han forzado actualizaciones incompatibles con los plugins existentes; queda
pendiente revisar esa cadena de herramientas.

## Sprint 1: mapa de implementación

El Sprint 1 se planificó del **9 al 22 de noviembre de 2026** con **ocho HU y 43 subtareas**. Las ocho historias suman **78 h 45 min**; con las cuatro tareas de control, **85 h 55 min** frente a **93 h 30 min** de capacidad estimada del equipo. La distribución y revisión detalladas siguen en ClickUp y en la Práctica 4.

| HU                                 | Área de trabajo prevista            | Dependencia o acuerdo inicial                                           |
| ---------------------------------- | ----------------------------------- | ----------------------------------------------------------------------- |
| HU-14 — Usuarios, roles y permisos | Servidor y migraciones              | T1 implementa identidad/perfil; T2 y T3 definirán roles y permisos      |
| HU-11 — Acceso del colaborador     | Web, servidor y autenticación       | Resolver sesiones y acceso autorizado para habilitar HU-05              |
| HU-05 — Crear reportes             | Interfaz, API, servidor y datos     | Definir estructura y errores de los reportes antes de consumirlos       |
| HU-06 — Evidencias                 | Interfaz, servidor y almacenamiento | Investigar servicio, límites y control de acceso a archivos             |
| HU-10 — Confianza y permisos       | Web y servidor                      | Utilizar las reglas de HU-14; coordinar con HU-08                       |
| HU-01 — Consultar una página       | Web, API y servidor                 | Necesita el modelo y la visibilidad de reportes de HU-05                |
| HU-08 — Validar o invalidar        | Web, servidor y datos               | Requiere identidad, reportes y reglas de permisos; valorar concurrencia |
| HU-09 — Credibilidad               | Web y servidor                      | Se alimenta de evidencias (HU-06) y valoraciones (HU-08)                |

Las principales cadenas son **HU-14 → HU-11 → HU-05**, **HU-14 → HU-10 → HU-08**, **HU-05 → HU-06 / HU-01** y **HU-06 + HU-08 → HU-09**. Estar en un mismo Sprint no hace que las tareas dependientes puedan empezar simultáneamente. HU-16 y HU-17 permanecen en el Product Backlog; no se implementan en este esqueleto.

## Cuestiones pendientes detectadas en la documentación de partida

Se mantienen estas observaciones del documento de arquitectura original para resolverlas al diseñar las HU, sin introducir decisiones arbitrarias:

1. El PDF de historias de usuario repite algunos bloques entre páginas. Contabilizar cada HU por su identificador una sola vez.
2. **HU-01:** los criterios originales mencionan entrar al detalle de un reporte, pero la planificación P4 redefine su T6 como información resumida desde el listado. HU-02, correspondiente al detalle completo, queda fuera del Sprint 1; acordar explícitamente el criterio de aceptación aplicable.
3. **HU-09:** una tarea de las historias de usuario sitúa la credibilidad en un desplegable del perfil, mientras P4 la concreta en el reporte con explicación de factores. Seguir la concreción acordada para el Sprint al diseñarla.
4. **HU-03:** la propuesta de alerta flotante debe ser compatible con el ConOps y con la restricción de no modificar la página externa. Elegir ubicación y permisos antes de usar inyección de contenido.
5. **HU-18 y HU-19:** comparten necesidades de verificación de propiedad de dominio. Evitar duplicar el mecanismo cuando entren en planificación.
6. La simulación de ausencia de una persona en P6 usa una reasignación distinta de la tabla de P4. Para la distribución real, consultar P4 y el tablero vigente, no interpretar la simulación como cambios ya aprobados.
7. La práctica P5 propone decidir acciones conforme a la cobertura, mientras P6 sugiere detener nuevas funciones por debajo del 80 %. Acordar una única regla verificable antes de automatizar ese umbral.
8. El diagrama de bloques del ConOps es un marcador, no una solución tecnológica aprobada. La propuesta inicial está documentada en [`architecture.md`](architecture.md) y en los ADR.

## Material usado al preparar el esqueleto

El documento inicial declaró haber revisado seis PDF (279 páginas en conjunto). Se indican aquí por nombre, **sin enlaces relativos a `Fuentes`**, porque esa carpeta no forma parte del árbol consultado del repositorio:

| Material                                        | Aportación principal                                                                      |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------- |
| _Dark-Shield ConOps_ (21 páginas)               | Alcance, actores, límites y componentes lógicos; IA auxiliar y restricciones de extensión |
| _Historias de usuario_ (23 páginas)             | Operaciones HU-01 a HU-23, pruebas, criterios y permisos                                  |
| _Soluciones prácticas 3, 4, 5 y 6_ (36 páginas) | Sprint 1, dependencias, revisiones, cobertura y seguimiento                               |
| _Tema 0 — Presentación_ (22 páginas)            | Contexto académico y colaboración del equipo                                              |
| _Tema 1 — Introducción_ (76 páginas)            | Trazabilidad, justificación de decisiones, arquitectura y deuda técnica                   |
| _Tema 2 — Aspectos Transversales_ (101 páginas) | Riesgos, seguridad, calidad, dependencias y CI                                            |

Documentación técnica de consulta: [Next.js (instalación)](https://nextjs.org/docs/app/getting-started/installation), [Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers), [WXT](https://wxt.dev/guide/installation.html), [configuración del manifest](https://wxt.dev/guide/essentials/config/manifest.html), [claves de Supabase](https://supabase.com/docs/guides/api/api-keys) y [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security). La revisión técnica recogida en el documento anterior se fechó el 9 de noviembre de 2026.
