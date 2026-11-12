# Reporte de Pruebas Automatizadas y Métricas de Calidad

## 1. Extracción de reportes (Vitest y SonarQube)

El proyecto utiliza **Vitest** (`@vitest/coverage-v8`) para ejecutar las pruebas unitarias y generar los reportes de cobertura en formatos `text`, `html`, `lcov` y `json-summary` dentro de `web/coverage/`.

- **Comando de ejecución:** `npm run test:coverage`
- **Archivo exportado para SonarQube:** `web/coverage/lcov.info` (configurado en `sonar-project.properties`).

### Resultados de la ejecución actual

| Suite de pruebas             | Archivos | Tests ejecutados | Tests aprobados | Fallos |
| :--------------------------- | :------: | :--------------: | :-------------: | :----: |
| `@darkshield/web` (`vitest`) |    3     |        54        |       54        |   0    |

### Desglose de cobertura por archivo

| Archivo                                    | % Sentencias | % Ramas  | % Funciones | % Líneas |
| :----------------------------------------- | :----------: | :------: | :---------: | :------: |
| `scripts/lib/auth-health.ts`               |     100%     |   100%   |    100%     |   100%   |
| `src/lib/supabase/client.ts`               |     100%     |   100%   |    100%     |   100%   |
| `src/lib/supabase/config.ts`               |     100%     |   100%   |    100%     |   100%   |
| `src/server/supabase.ts`                   |     100%     |   100%   |    100%     |   100%   |
| `src/server/profiles.ts` _(solo tipos TS)_ |      —       |    —     |      —      |    —     |
| **Total global ejecutables**               |   **100%**   | **100%** |  **100%**   | **100%** |

---

## 2. Cálculo del Porcentaje de Cobertura de Código (% CPA)

$$\text{\% CPA} = \left( \frac{\text{Líneas cubiertas por pruebas}}{\text{Total de líneas ejecutables}} \right) \times 100$$

- **Resultado actual:** **% CPA = 100%** (supera el umbral mínimo del 80% configurado en `web/vitest.config.ts`).

---

## 3. Densidad de Defectos por Historia de Usuario (DDP)

$$\text{DDP} = \frac{\text{Número total de defectos detectados}}{\text{Número de Historias de Usuario (HUs) evaluadas}}$$

- **Historias de Usuario (HUs) evaluadas en esta iteración:** 2 HUs base de infraestructura y autenticación (`HU-10`, `HU-11`) de las 23 definidas en el backlog[cite: 3].
- **Defectos detectados en pruebas:** 0
- **Resultado actual:** $\text{DDP} = \frac{0}{2} = \mathbf{0,00\ defectos/HU}$
