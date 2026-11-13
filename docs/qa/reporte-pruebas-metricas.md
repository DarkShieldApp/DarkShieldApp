# Reporte de pruebas y métricas de calidad (T-CTRL-02)

| Campo             | Valor                                                        |
| ----------------- | ------------------------------------------------------------ |
| Tarea de control  | T-CTRL-02 — Calcular cobertura y defectos detectados         |
| Periodo           | Sprint 1, semana 1 (9–15/11/2026)                            |
| Fecha de medición | 13/11/2026                                                   |
| Commit medido     | `27dff0c` (`main`)                                           |
| Entorno           | Node.js 24.22.1, npm 11.19.1, Supabase CLI 3.1.0, Windows 11 |
| Responsable       | Sergio Fernández                                             |
| Revisor           | Ignacio García                                               |

Las cifras de este informe proceden de una ejecución local sobre el commit indicado.
No acreditan una ejecución de GitHub Actions ni de SonarQube.

## 1. Comandos ejecutados

| Comando                  | Resultado                                                 |
| ------------------------ | --------------------------------------------------------- |
| `npm ci`                 | Correcto (avisos moderados en dependencias de desarrollo) |
| `npm run check`          | Correcto: formato, ESLint, tipos y builds web y extensión |
| `npm run test:coverage`  | Correcto: 4 archivos, 120 tests, umbral del 80 % superado |
| `npm run supabase:start` | Correcto: migraciones de `profiles` y `roles` aplicadas   |
| `npm run test:db`        | Correcto: 6 suites, 192 aserciones (`Result: PASS`)       |
| `npm run supabase:stop`  | Correcto, conservando los volúmenes locales               |

## 2. Resultados de pruebas

### 2.1. Vitest (`@darkshield/web`)

| Archivo de test                    |  Tests  | Aprobados | Fallos |
| ---------------------------------- | :-----: | :-------: | :----: |
| `web/tests/auth-health.test.ts`    |   16    |    16     |   0    |
| `web/tests/clients.test.ts`        |   13    |    13     |   0    |
| `web/tests/config.test.ts`         |   25    |    25     |   0    |
| `web/tests/evidence-rules.test.ts` |   66    |    66     |   0    |
| **Total (4 archivos)**             | **120** |  **120**  | **0**  |

La extensión no tiene script `test` ni `test:coverage`; el comando raíz la omite con
`--if-present`, por lo que no aporta tests ni cobertura.

### 2.2. Cobertura V8 por archivo

Valores «cubiertas/totales» de `web/coverage/coverage-summary.json`.

| Archivo                      |  Líneas   | Sentencias |   Ramas   | Funciones |
| ---------------------------- | :-------: | :--------: | :-------: | :-------: |
| `scripts/lib/auth-health.ts` |   13/13   |   13/13    |   15/15   |    1/1    |
| `src/lib/evidences/rules.ts` |   41/41   |   50/50    |   31/31   |   15/15   |
| `src/lib/supabase/client.ts` |    2/2    |    2/2     |    0/0    |    1/1    |
| `src/lib/supabase/config.ts` |   17/17   |   17/17    |   18/18   |    2/2    |
| `src/server/supabase.ts`     |    2/2    |    2/2     |    0/0    |    1/1    |
| `src/server/profiles.ts` ¹   |    0/0    |    0/0     |    0/0    |    0/0    |
| **Total del ámbito**         | **75/75** | **84/84**  | **64/64** | **20/20** |
| **Porcentaje**               | **100 %** | **100 %**  | **100 %** | **100 %** |

¹ Solo contiene tipos TypeScript; tras compilar queda vacío y V8 lo omite
(«1 empty file skipped»). No suma líneas instrumentables.

### 2.3. pgTAP (`supabase/tests/`)

| Suite                        | Qué verifica                                        | Aserciones | Resultado |
| ---------------------------- | --------------------------------------------------- | :--------: | :-------: |
| `profiles_model.test.sql`    | Estructura, restricciones y triggers de `profiles`  |     51     |    ok     |
| `profiles_backfill.test.sql` | Creación de perfiles para usuarios preexistentes    |     6      |    ok     |
| `profiles_rls.test.sql`      | Políticas RLS de `profiles` con roles reales        |     61     |    ok     |
| `roles_model.test.sql`       | Catálogo `roles`, FK y valor por defecto del perfil |     22     |    ok     |
| `roles_backfill.test.sql`    | Asignación de rol a perfiles anteriores a T2        |     5      |    ok     |
| `roles_rls.test.sql`         | Políticas RLS del catálogo y del rol propio         |     47     |    ok     |
| **Total (6 suites)**         |                                                     |  **192**   | **PASS**  |

El total coincide con la salida de `pg_prove` (`Files=6, Tests=192`). El reparto por
suite se obtuvo ejecutando cada archivo con `psql` contra la misma instancia local.

pgTAP verifica la integridad del esquema y las políticas RLS **dentro de PostgreSQL**.
No ejecuta código TypeScript y, por tanto, **no aporta cobertura V8** ni modifica el
% CPA; sus resultados se informan por separado.

## 3. Porcentaje de cobertura de código (% CPA)

$$\text{\% CPA} = \left( \frac{\text{Líneas cubiertas}}{\text{Líneas instrumentables}} \right) \times 100 = \frac{75}{75} \times 100 = 100\ \%$$

**Ámbito medido** (definido en `web/vitest.config.ts` y [desarrollo](../development.md)):
todos los `.ts` de `web/src/lib/`, `web/src/server/` y `web/scripts/lib/`, aunque no
los importe ninguna prueba, excluyendo declaraciones `.d.ts`.

**Fuera de la medición** (sin instrumentación):

| Parte                                            | Motivo                                                       |
| ------------------------------------------------ | ------------------------------------------------------------ |
| `extension/src/` (popup `App.tsx`, `main.tsx`)   | La extensión aún no tiene Vitest ni scripts de cobertura     |
| `web/src/app/page.tsx`, `web/src/app/layout.tsx` | Pantallas de arranque sin lógica de negocio                  |
| `web/src/app/api/`                               | Rutas aún inexistentes (solo contiene un `README.md`)        |
| `web/scripts/check-supabase.ts`                  | Lanzador de consola; la lógica medida está en `scripts/lib/` |
| SQL de `supabase/migrations/`                    | Se verifica con pgTAP, que no produce cobertura V8           |

El 100 % es la cobertura **de ese ámbito**, no la del producto. Cuando se añadan
rutas, componentes funcionales o comportamiento en la extensión, el ámbito deberá
ampliarse y el valor podrá bajar.

## 4. Densidad de defectos por HU (DDP)

$$\text{DDP} = \frac{\text{Defectos confirmados}}{\text{HU revisadas en el periodo}}$$

**Definición de defecto:** incidencia confirmada y registrada en ClickUp, vinculada a
una HU. No se cuentan como defectos de una HU:

- los fallos de CI corregidos antes del merge;
- las observaciones de revisión sobre tareas de control (como la de este informe).

**HU revisada:** HU que ha pasado por el estado «En revisión» en ClickUp durante el
periodo. Cuenta una sola vez aunque vuelva varias veces a ese estado.

| Dato                       | Valor | Fuente                                     |
| -------------------------- | :---: | ------------------------------------------ |
| HU revisadas en el periodo |   0   | Tablero de ClickUp, estado «En revisión»   |
| Defectos confirmados       |   0   | Incidencias de ClickUp vinculadas a una HU |
| Defectos por gravedad      |   —   | No hay defectos que clasificar             |

**Resultado: DDP = No disponible (ninguna HU revisada en el periodo).** El indicador
no se calcula como 0 porque el denominador es cero.

## 5. Trabajo en curso

En `main` hay subtareas integradas: HU-14/T1–T2 (perfiles y roles persistentes) y
HU-06/T6 (reglas de rechazo de archivos de evidencia). Son subtareas, no HU
completadas; ninguna de sus HU ha pasado todavía por «En revisión», por lo que no
entran en el denominador del DDP.

## 6. SonarQube

Solo existe la configuración `sonar-project.properties`, que apunta a
`web/coverage/lcov.info`. **El análisis todavía no se ha ejecutado** y no hay
resultados de SonarQube que informar.

Cuando se ejecute, su cobertura no coincidirá necesariamente con el % CPA: la
configuración declara como fuentes `web/src` y `extension/src` completos (incluidas
partes sin instrumentar) y no incluye `web/scripts/lib`.

## 7. Interpretación

| Indicador | Valor                               | Umbrales                                    | Estado        |
| --------- | ----------------------------------- | ------------------------------------------- | ------------- |
| % CPA     | 100 % (ámbito medido, 75/75 líneas) | Verde ≥ 80 %; amarillo 65–80 %; rojo < 65 % | 🟢 Verde      |
| DDP       | No disponible (ninguna HU revisada) | Verde ≤ 0,5; amarillo ≤ 1,2; rojo > 1,2     | ⚪ Sin estado |

- La cobertura del ámbito medido está en verde, pero corresponde a librerías y
  servidor; no hay todavía rutas ni extensión instrumentadas.
- El DDP no tiene estado porque no se ha revisado ninguna HU. No debe leerse como
  ausencia de defectos en el producto.
- Las pruebas pgTAP (192 aserciones) respaldan la integridad y la RLS de perfiles y
  roles, sin efecto sobre el % CPA.

**Siguiente medición semanal:** 20/11/2026 (semana 2 del Sprint 1, 16–22/11/2026).
