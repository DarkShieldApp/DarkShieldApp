# DarkShield

Base inicial del proyecto: dos aplicaciones TypeScript en un repositorio con npm
workspaces. La web utiliza Next.js (interfaz React y backend HTTP); la extensión,
WXT con React y Manifest V3. Supabase será la base de datos.

Este esqueleto solo muestra una página y un popup de arranque. No implementa ninguna
HU, endpoint, autenticación, modelo de datos, consulta, alerta ni integración con IA.
No necesita credenciales ni un proyecto Supabase para arrancar.

## Estructura

```text
DarkShieldApp/
├── web/
│   └── src/
│       ├── app/             # Páginas y layouts de Next.js
│       │   └── api/         # Lugar para los futuros endpoints
│       └── server/          # Lugar para negocio e integraciones del servidor
├── extension/
│   ├── src/entrypoints/popup/
│   └── wxt.config.ts       # WXT genera el manifest al compilar
├── supabase/
│   └── migrations/         # Reserva para futuros cambios SQL
├── docs/
│   └── arquitectura.md     # Análisis de las seis fuentes y decisión inicial
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

Tras compilar la web, `npm run start --workspace @darkshield/web` arranca su servidor
de producción. No desplegarla como una exportación estática cuando incorpore API.

Instalar dependencias de una aplicación con `npm install <paquete> --workspace
@darkshield/web` o `--workspace @darkshield/extension`. Mantener el lockfile de la raíz
y usar `npm ci` para reproducir la instalación. No crear lockfiles en cada aplicación.

## Configuración y próximos trabajos

Las plantillas `web/.env.example` y `extension/.env.example` documentan las futuras
variables; todavía no se consumen. Cuando haga falta, copiarlas a `.env.local` en
su mismo directorio. Los archivos locales están excluidos de Git.

La preparación de Supabase se explica en [supabase/README.md](supabase/README.md).
No se han creado recursos remotos ni instalado SDKs que todavía no se utilizan.

La CI inicial ejecuta `npm ci` y `npm run check` en las PR dirigidas a `main` y en
los cambios de `main`. No despliega ni requiere secretos. El workflow se activará
cuando el equipo suba estos archivos a GitHub.

**Pruebas funcionales y cobertura: no disponibles.** No se han añadido tests de
pantallas vacías ni un comando de tests que simule éxito. Al comenzar la primera HU,
configurar las pruebas y su cobertura e incorporarlas a CI. El objetivo del 80 % de
la DoD debe medirse sobre código funcional, con su alcance declarado. Estas
comprobaciones de arranque no dan por terminada ninguna HU.

Consultar [la decisión de arquitectura](docs/arquitectura.md) para el mapa de HU,
las dependencias del Sprint 1 y las discrepancias encontradas en las fuentes.
