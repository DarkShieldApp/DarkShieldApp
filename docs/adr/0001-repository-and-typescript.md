# ADR-001 — Repositorio único y TypeScript

- **Fecha:** 9 de noviembre de 2026.
- **Estado:** adoptada en el esqueleto inicial; revisable por el equipo.

## Contexto

DarkShield necesita una aplicación web y una extensión de navegador desarrolladas por un equipo de ocho personas. Se busca mantener una base reproducible con la menor configuración adicional razonable.

## Decisión

Mantener ambas aplicaciones en **un único repositorio**, separadas en `web/` y `extension/`, con **TypeScript** en ambas y **React** para sus interfaces. Administrar las dependencias mediante **npm workspaces**, un solo lockfile en la raíz y comandos compartidos de lint, tipos, formato y compilación. No incorporar inicialmente Nx ni Turborepo.

La extensión se compila a JavaScript para ejecutarse en el navegador; TypeScript aporta comprobación estática sin exigir un lenguaje adicional.

## Alternativas y consecuencias

- **Repositorios separados:** facilitarían ciclos de publicación independientes, pero ahora duplicarían configuración y dificultarían coordinar los contratos entre clientes y servidor.
- **Una sola aplicación que mezcle el código de ambos productos:** complicaría aislar APIs del navegador, servidor, secretos y empaquetado de la extensión.
- **JavaScript sin TypeScript en la extensión:** es viable, pero perdería uniformidad y comprobaciones de tipos.
- **Orquestación avanzada del monorepositorio:** no se justifica con el tamaño y las necesidades actuales.

La elección simplifica instalación y coordinación, a cambio de mantener límites claros entre workspaces. No implica compartir automáticamente todos los componentes ni ejecutar el servidor dentro de la extensión. Las versiones se fijan en los manifiestos y el lockfile.

**Referencia:** [arquitectura general](../architecture.md) y [desarrollo](../development.md).
