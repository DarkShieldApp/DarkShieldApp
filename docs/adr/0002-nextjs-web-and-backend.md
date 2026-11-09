# ADR-002 — Web y backend con Next.js

- **Fecha:** 9 de noviembre de 2026.
- **Estado:** adoptada en el esqueleto inicial; revisable por el equipo.

## Contexto

La plataforma necesita una interfaz React, operaciones HTTP para web y extensión, y lógica centralizada para usuarios, reportes, validaciones y otras reglas del sistema. En el primer Sprint conviene evitar operar dos servidores propios si no es necesario.

## Decisión

Usar **Next.js con App Router, React y TypeScript** en `web/` para la interfaz y el futuro backend. Situar páginas y _Route Handlers_ en `web/src/app/` (los endpoints bajo `app/api/`) y reservar `web/src/server/` para lógica de negocio, autorización e integraciones. La aplicación requerirá un runtime servidor cuando tenga API; no se desplegará como exportación estática para las funcionalidades de negocio.

## Alternativas y consecuencias

- **React/Vite con Express o Fastify:** permitiría separar el backend, pero exigiría un proceso, despliegue y configuración adicionales. Puede reconsiderarse si aparecen necesidades reales de despliegue independiente.
- **Usar Supabase como única API de negocio para todos los clientes:** no es adecuado como planteamiento general para toda la lógica de confianza, valoración, moderación, límites de abuso e IA descrita en el ConOps.
- **Crear un servicio independiente de IA desde el principio:** sería prematuro sin necesidades de carga, colas o aislamiento confirmadas.

Se aceptan las convenciones y dependencia de Next.js a cambio de reducir la configuración propia. **No hay todavía endpoints ni funcionalidades del dominio implementados**. La extensión deberá comunicarse por contratos HTTP acordados; autenticación, CORS y sesiones siguen pendientes.

**Referencia:** [arquitectura general](../architecture.md).
