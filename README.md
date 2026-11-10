# Dark-Shield

Base inicial del proyecto: dos aplicaciones TypeScript en un repositorio con npm
workspaces. La web utiliza Next.js (interfaz React y backend HTTP); la extensión,
WXT con React y Manifest V3. Supabase es la persistencia acordada y Supabase Auth
el sistema de autenticación elegido.

La interfaz conserva una página y un popup de arranque. HU-14/T1 incorpora la entidad
persistente de usuario: `public.profiles`, vinculada a Supabase Auth, con migración,
creación automática, RLS y pruebas PostgreSQL. No completa HU-14 ni implementa
endpoints, flujos de autenticación, alertas o integración con IA.
Incluye factorías Supabase sin estado, diagnóstico manual de Auth y pruebas unitarias.
No necesita credenciales ni un proyecto Supabase para arrancar.

## Estructura

```text
DarkShieldApp/
├── web/
│   └── src/
│       ├── app/             # Páginas y layouts de Next.js
│       │   └── api/         # Lugar para los futuros endpoints
│       ├── lib/supabase/    # Configuración y cliente de navegador
│       └── server/          # Cliente Supabase y tipo Profile del dominio
├── extension/
│   ├── src/entrypoints/popup/
│   └── wxt.config.ts       # WXT genera el manifest al compilar
├── supabase/
│   ├── config.toml         # Instancia local aislada mediante CLI
│   ├── migrations/         # Esquema de profiles, triggers y RLS
│   └── tests/              # Pruebas pgTAP de integridad y seguridad
├── docs/
│   └── architecture.md     # Arquitectura y decisiones iniciales
├── .github/workflows/ci.yml
├── package.json
└── package-lock.json       # Un único lockfile para todo el equipo
```

## Arranque

Requisitos: **Node.js 24.x** y **npm 11 o 12**. `.nvmrc` fija la rama de Node.
Ejecutar los comandos desde la raíz del repositorio.

```sh
npm ci
npm run dev:web
```

La web estará disponible en <http://localhost:3000>.

Para la extensión, en otra terminal:

```sh
npm run dev:extension
```

En Chrome o Edge, abrir la página de gestión de extensiones, activar el modo de
desarrollador y elegir **Cargar descomprimida** con la carpeta
`extension/.output/chrome-mv3-dev`. Abrir su popup desde la barra del navegador.
WXT se ejecuta sin abrir un navegador automáticamente. Si se reinicia WXT,
recargar la extensión desde la página de gestión de extensiones.

Para comprobar el paquete de producción, ejecutar `npm run build:extension` y
cargar `extension/.output/chrome-mv3`. El manifest de producción no solicita
permisos ni acceso a sitios. WXT puede añadir permisos locales a su variante de
desarrollo para la recarga automática. Chrome/Edge son el objetivo inicial;
otros navegadores requerirán su propia comprobación de compatibilidad.

## Comandos

| Comando                   | Resultado                                          |
| ------------------------- | -------------------------------------------------- |
| `npm run dev:web`         | Desarrollo de web y futuro backend                 |
| `npm run dev:extension`   | Desarrollo de la extensión                         |
| `npm run build:web`       | Compilar la web                                    |
| `npm run build:extension` | Generar extensión de producción                    |
| `npm run build`           | Compilar ambas aplicaciones                        |
| `npm run lint`            | ESLint en ambas aplicaciones                       |
| `npm run typecheck`       | Generar tipos del framework y comprobar TypeScript |
| `npm run format`          | Formatear código y documentación                   |
| `npm run check`           | Formato, lint, tipos y compilación                 |
| `npm test`                | Pruebas unitarias, sin modo interactivo            |
| `npm run test:coverage`   | Pruebas e informes V8, umbral del 80 % por archivo |
| `npm run test:db`         | Pruebas SQL/pgTAP contra Supabase local iniciado   |
| `npm run supabase:check`  | Diagnóstico remoto de Auth usando `web/.env`       |
| `npm run supabase:start`  | Iniciar Supabase local (requiere Docker)           |
| `npm run supabase:stop`   | Detener Supabase local conservando los datos       |
| `npm run supabase:status` | Consultar el estado de la instancia local          |

Tras compilar la web, `npm run start --workspace @darkshield/web` arranca su servidor
de producción. No desplegarla como una exportación estática cuando incorpore API.

Instalar dependencias de una aplicación con `npm install <paquete> --workspace
@darkshield/web` o `--workspace @darkshield/extension`. Mantener el lockfile de la raíz
y usar `npm ci` para reproducir la instalación. No crear lockfiles en cada aplicación.

## Configuración y próximos trabajos

Copiar `web/.env.example` a `web/.env` solo si este último no existe. Completar
`NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` desde el proyecto
Supabase creado manualmente. Usar una clave `sb_publishable_...`, nunca una clave
privilegiada. El archivo local está excluido de Git; no sobrescribirlo al actualizar.
La plantilla de la extensión sigue siendo futura: la extensión accederá a la API web.

La preparación de Supabase se explica en [supabase/README.md](supabase/README.md).
Las factorías validan las variables al invocarse. La página inicial y su build siguen
funcionando sin configuración. Next.js fija los valores públicos del navegador en
el build: para usar el cliente en un despliegue futuro, configurar y recompilar.

La CI en `.github/workflows/ci.yml` ejecuta `npm ci`, `npm run check` y
`npm run test:coverage` con Node.js 24 y npm 12.2.1 en PR dirigidas a `main` y push
a `main`. Un job independiente inicia Supabase local con PostgreSQL 17, aplica
las migraciones, ejecuta `npm run test:db` y detiene los servicios incluso si falla.
No despliega, no necesita secretos y no accede al Supabase remoto.
Su ejecución en GitHub quedará pendiente hasta que el equipo publique los cambios.

Las pruebas cubren configuración, inicialización sin sesiones y diagnóstico de Auth.
El informe HTML se genera en `web/coverage/index.html`; el alcance y la ampliación
a futuras HU y a la extensión se detallan en [desarrollo](docs/development.md).
La suite SQL comprueba la entidad y los accesos con roles reales; su resultado
es independiente de la cobertura V8. El [diseño del dominio](docs/domain-design.md)
describe T1 y los trabajos pendientes de roles, permisos, confianza y autenticación.

Consultar [la decisión de arquitectura](docs/architecture.md) para el mapa de HU,
las dependencias del Sprint 1 y las discrepancias encontradas en las fuentes.
