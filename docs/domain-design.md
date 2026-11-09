# Diseño del dominio

> Estado: **pendiente de definir**. Este archivo no representa todavía un modelo de entidades, un diagrama de clases ni un esquema de base de datos.

El ConOps y las historias de usuario ya describen conceptos funcionales —usuarios y roles, reportes, evidencias, validaciones, nivel de confianza de los colaboradores y credibilidad de los reportes—, pero **aún no se han acordado entidades, atributos, relaciones, cardinalidades ni reglas de persistencia**.

El diseño se completará progresivamente al abordar las HU correspondientes, especialmente HU-14 (usuarios y permisos), HU-05 (reportes), HU-06 (evidencias), HU-08 (validaciones) y HU-09 (credibilidad). Se coordinará con las migraciones de Supabase y con los contratos de la API, evitando confundir los conceptos del ConOps con tablas o clases ya implementadas.

Para el contexto tecnológico y las responsabilidades de cada componente, consultar [architecture.md](architecture.md). Para la planificación de estas HU, consultar [development.md](development.md).
