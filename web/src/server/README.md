# Código del servidor

Ubicación para las futuras reglas de negocio, autorización e integraciones con
Supabase e IA. Añadir módulos por funcionalidad cuando lo requiera cada HU; no
concentrar toda la lógica en los Route Handlers.

Este código no debe importarse desde componentes con `"use client"` ni desde la
extensión. Al crear módulos con acceso a datos o secretos, usar `import 'server-only'`
y añadir su dependencia para que Next.js compruebe esa frontera.

No hay servicios, modelos, clientes de Supabase ni lógica de negocio implementados.
