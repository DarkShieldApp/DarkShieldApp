# Código del servidor

Ubicación para las reglas de negocio, autorización e integraciones. `supabase.ts`
ofrece una factoría sin estado con clave publicable, protegida con `server-only`.
Añadir módulos por funcionalidad cuando lo requiera cada HU; no
concentrar toda la lógica en los Route Handlers.

Este código no debe importarse desde componentes con `"use client"` ni desde la
extensión. Al crear módulos con acceso a datos o secretos, usar `import 'server-only'`
y mantener esa frontera, comprobada por Next.js (la dependencia ya está instalada).

`profiles.ts` exporta el tipo persistido `Profile` de HU-14/T1. Usar
`import type { Profile } from '@/server/profiles'` en los futuros módulos del
servidor. Refleja la fila SQL, con UUID y fechas como cadenas JSON; no valida
entradas ni crea un cliente, servicio CRUD o sesión. Mantenerlo alineado con las
migraciones. La integridad y la autorización inicial se verifican en PostgreSQL.

Todavía no hay sesiones ni operaciones de negocio en Next.js. Uso y límites de
la factoría en [la guía de desarrollo](../../../docs/development.md#clientes-supabase).
