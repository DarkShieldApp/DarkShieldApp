# Código del servidor

Ubicación para las reglas de negocio, autorización e integraciones. `supabase.ts`
ofrece una factoría sin estado con clave publicable, protegida con `server-only`.
Añadir módulos por funcionalidad cuando lo requiera cada HU; no
concentrar toda la lógica en los Route Handlers.

Este código no debe importarse desde componentes con `"use client"` ni desde la
extensión. Al crear módulos con acceso a datos o secretos, usar `import 'server-only'`
y mantener esa frontera, comprobada por Next.js (la dependencia ya está instalada).

No hay modelos, sesiones ni lógica de negocio implementados. Uso y límites de la
factoría en [la guía de desarrollo](../../../docs/development.md#clientes-supabase).
