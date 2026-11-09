# Desarrollo del proyecto

> Estado: guía breve del esqueleto y planificación del Sprint 1 (9-22 de noviembre de 2026). No presupone funcionalidades terminadas.

## Puesta en marcha y organización

El repositorio tiene dos _workspaces_ npm: `web/` (`@darkshield/web`) y `extension/` (`@darkshield/extension`), con un solo `package-lock.json` en la raíz. Se utiliza **Node.js 24.x**, **npm 11 o 12**, TypeScript estricto, ESLint y Prettier. El detalle de instalación, comandos y carga local de la extensión ya está explicado en el [README](../README.md) y no se repite aquí.

Para instalar dependencias se usa `npm ci`. Los comandos principales son `npm run dev:web`, `npm run dev:extension` y `npm run check` (formato, lint, tipos y compilación). Al instalar una dependencia específica de una aplicación, usar su _workspace_ y conservar el lockfile único.

Las plantillas `web/.env.example` y `extension/.env.example` describen variables para integraciones futuras, pero el esqueleto todavía no las consume. Los secretos deben quedar fuera del control de versiones. Las variables `NEXT_PUBLIC_` y las empaquetadas en la extensión son visibles para el cliente; **no son un lugar para claves secretas**. La preparación de datos se desarrolla en [`supabase/README.md`](../supabase/README.md).

## Flujo de trabajo y calidad

- Cada historia de usuario (HU) tiene tareas, criterios de aceptación y dependencias. La selección y seguimiento del Sprint se gestiona en ClickUp; este documento solo orienta la implementación técnica.
- Acordar el contrato entre componentes antes de desarrollar funcionalidades dependientes. Mantener pequeñas y revisables las contribuciones mediante _pull requests_.
- El trabajo se considera completado después de superar sus criterios de aceptación y **revisión independiente**: la persona revisora no debe ser quien haya implementado la historia.
- Incorporar pruebas reales conforme aparezca código de negocio: unitarias, integración y las funcionales necesarias. Las prácticas contemplan TDD y un objetivo de **80 % de cobertura** dentro de la definición de terminado (DoD); se deberá precisar qué código se incluye en la medición. No atribuir cobertura a pantallas vacías.
- No añadir datos simulados, endpoints de muestra o pruebas ficticias solo para dar apariencia de funcionalidad. Las decisiones técnicas y riesgos relevantes se documentan en los [ADR](adr/0001-repository-and-typescript.md) o en las tareas que los motivan.

### Estado de las comprobaciones

La documentación del esqueleto original dejó registradas estas verificaciones locales (Node.js 24.15.0 y npm 12.2.1): instalación, `npm run check`, respuesta HTTP 200 de la web de arranque, compilación de la extensión Manifest V3 sin permisos de producción y `git diff --check`. **No** se había instalado y probado manualmente la extensión en un navegador ni comprobado ninguna HU o integración real.

**A fecha 9/11/2026, en la rama `main` de GitHub, `.github/workflows/` contiene únicamente `.gitkeep`.** Aunque el README describe una CI inicial, no se ha encontrado `ci.yml` en la rama consultada. La configuración y ejecución de la CI deben verificarse cuando se suba el workflow. En todo caso, `npm run check` no ejecuta aún pruebas funcionales ni calcula cobertura.

El proyecto arranca sin credenciales de Supabase. No hay todavía esquema, autenticación, conexión a datos, alertas, análisis de IA ni una medida de cobertura disponible.

### Dependencias de herramientas

Las versiones exactas se encuentran en los `package.json` y el lockfile; en el esqueleto se fijaron TypeScript 5.9.3 y ESLint 9.39.5 para mantener la compatibilidad con la cadena de plugins utilizada. La auditoría inicial consignó ocho avisos moderados en dependencias de desarrollo relacionados con `minimatch`, y ninguno en la ejecución realizada con `npm audit --omit=dev`. No se ejecutó `npm audit fix --force` porque proponía retrocesos incompatibles. **Estos resultados son históricos, no una auditoría nueva ni una garantía de seguridad.** Revisar [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) y compatibilidad con ESLint 10 en las futuras actualizaciones.

## Sprint 1: mapa de implementación

El Sprint 1 se planificó del **9 al 22 de noviembre de 2026** con **ocho HU y 43 subtareas**. Las ocho historias suman **78 h 45 min**; con las cuatro tareas de control, **85 h 55 min** frente a **93 h 30 min** de capacidad estimada del equipo. La distribución y revisión detalladas siguen en ClickUp y en la Práctica 4.

| HU                                 | Área de trabajo prevista            | Dependencia o acuerdo inicial                                           |
| ---------------------------------- | ----------------------------------- | ----------------------------------------------------------------------- |
| HU-14 — Usuarios, roles y permisos | Servidor y migraciones              | Acordar identidades, perfiles y permisos antes de HU-11 y HU-10         |
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
