# ADR-003 — Extensión con WXT y Manifest V3

- **Fecha:** 9 de noviembre de 2026.
- **Estado:** adoptada para el esqueleto; funcionalidades y permisos pendientes.

## Contexto

El ConOps contempla una extensión como cliente complementario de la plataforma. Su cometido es consultar información existente sobre la página visitada y mostrar avisos, no inspeccionar autónomamente cualquier página ni modificar las webs externas.

## Decisión

Utilizar **WXT con React, TypeScript y Manifest V3**, inicialmente para **Chrome y Edge**. WXT generará el manifest y empaquetará los puntos de entrada. Mantener el popup de arranque sin solicitar permisos de sitios ni inyectar _content scripts_ en producción. Otros navegadores requerirán comprobaciones de compatibilidad específicas.

## Alternativas y consecuencias

- **Mantener manualmente manifest, empaquetado y recarga:** evita depender de WXT, pero aumenta el mantenimiento para un equipo que también desarrolla una plataforma web.
- **Activar desde ya permisos globales o monitorización pasiva:** no se justifica sin diseñar las historias y evaluar privacidad, permisos y experiencia de usuario.

WXT reduce trabajo de configuración, aunque añade una herramienta que aprender. Al implementar HU-17 o HU-03 se estudiarán _background/service workers_, permisos y acceso a la URL activa. `activeTab` cubre determinadas interacciones iniciadas por el usuario; la observación pasiva de navegación requiere otro análisis. Se evitará presentar un aviso como información verificada cuando no lo esté. **Actualmente el popup no consulta al servidor ni emite alertas reales.**

**Referencia:** [arquitectura general](../architecture.md) y [Sprint 1](../development.md).
