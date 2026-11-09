# ADR-004 — Persistencia con Supabase

- **Fecha:** 9 de noviembre de 2026.
- **Estado:** elección de Supabase acordada por el equipo; integración y diseño de datos pendientes.

## Contexto

El ConOps requiere conservar usuarios, reportes, evidencias, validaciones y otros datos del sistema. La elección de Supabase como base de datos es una decisión del equipo previa al esqueleto.

## Decisión

Usar **Supabase / PostgreSQL** para la persistencia y reservar `supabase/migrations/` para cambios SQL versionados. **Supabase Auth** se considera una opción para HU-11 y **Supabase Storage** para las evidencias de HU-06, pero ninguno de los dos está adoptado ni integrado todavía como funcionalidad terminada.

La lógica de negocio se centralizará en el servidor web. Al crear tablas expuestas se deberán diseñar las políticas RLS correspondientes, además de autorizar operaciones en los puntos adecuados. Las credenciales con privilegios y los secretos no estarán accesibles desde la extensión o el frontend.

## Consecuencias y asuntos abiertos

- Acordar esquema, identificadores, relaciones, migraciones y políticas de acceso al desarrollar las HU; no anticipar un modelo de entidades ficticio.
- Definir sesiones, acceso autorizado y denegado, buckets y tamaño/formato de evidencias cuando se necesiten.
- Las claves publicables **no** sustituyen RLS; las claves secretas o de `service_role` tienen privilegios especiales y deben permanecer bajo control del servidor.
- El plan Free puede facilitar el arranque, pero sus límites de capacidad, transferencia, almacenamiento o inactividad deberán revisarse antes de dimensionar. No se ha contratado ni configurado infraestructura remota.
- La confianza y credibilidad son reglas propias de DarkShield; PostgreSQL no las calcula automáticamente.

No se ha decidido incorporar ORM ni un servicio de almacenamiento diferente. Se reconsiderarán alternativas si el desarrollo aporta una necesidad concreta.

**Referencias:** [arquitectura general](../architecture.md), [diseño del dominio](../domain-design.md), [guía de Supabase del repositorio](../../supabase/README.md) y [precios oficiales](https://supabase.com/pricing).
