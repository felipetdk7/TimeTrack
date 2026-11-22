# PROJECT: TimeTrack — Control de Tiempo y Tareas para Equipos Google Workspace

> **Documento de especificación para agentes de IA y arneses de desarrollo (Agent Harness / Coding Agents).**  
> Este documento contiene el contexto completo, arquitectura, reglas de negocio, invariantes del sistema, instrucciones de ejecución y guía de extensión para que cualquier agente autónomo (Cursor, Claude Code, Devin, Antigravity, SWE-bench, Copilot, Aider, Windsurf) pueda comprender, probar, mantener y evolucionar esta aplicación sin ambigüedades.

---

## 1. Visión General del Proyecto

**TimeTrack** es una aplicación web responsiva (Mobile-First / Desktop) diseñada para equipos de trabajo (~15 personas) integrados con el ecosistema de **Google Workspace**. Permite gestionar proyectos, asignar tareas, registrar tiempos de dedicación en tiempo real con temporizadores unificados y sincronizar eventos de **Google Calendar** para convertirlos en sugerencias de horas o tareas medibles en un clic, además de importar/exportar datos con **Google Sheets**.

### Objetivos Clave
- **Control de Tiempo Preciso**: Medición mediante temporizador activo en el encabezado (único por usuario) o entradas manuales con validación de no-solapamiento.
- **Medición Universal**: Toda tarea (sin importar su estado o a quién esté asignada) dispone de botón para medir tiempo.
- **Integración Nativa con Google Calendar**: Lectura de eventos en ventana de ±7 días, auto-detección del patrón `[Proyecto] Tarea`, sugerencias de confirmación en un clic y extracción de eventos del calendario hacia el tablero de tareas.
- **Integración con Google Sheets**: Importación de proyectos y tareas a partir de cualquier enlace/ID de Google Sheets y exportación de reportes detallados.
- **Roles y Permisos**: Roles `Admin` (gestión de proyectos, tareas, colaboradores, configuración de bloqueo y reportes globales) y `Employee` (vista "Mi Semana", tareas asignadas y registro de su propio tiempo).
- **Zona Horaria Estricta**: Todas las operaciones temporales se calculan y presentan en `America/Bogota` (GMT-5).

---

## 2. Stack Tecnológico

| Capa | Tecnología | Versión | Propósito |
|---|---|---|---|
| **Frontend Framework** | React | `^19.0.1` | Interfaz de usuario reactiva basada en hooks |
| **Lenguaje** | TypeScript | `^7.0.2` | Tipado estricto en toda la aplicación |
| **Build Tool / Bundler** | Vite | `^8.3.0` | Compilador ultrarrápido y servidor de desarrollo |
| **Estilos** | Tailwind CSS | `^4.3.3` | Framework de diseño utilitario (vía `@tailwindcss/vite`) |
| **Iconografía** | Lucide React | `^0.546.0` | Iconos vectoriales coherentes |
| **Animaciones** | Motion | `^12.23.24` | Microinteracciones y transiciones |
| **Autenticación** | Firebase Auth (Google OAuth) | `^13.4.0` | Inicio de sesión con Google y gestión de credenciales |
| **APIs Externas** | Google Calendar API v3 & Google Sheets API v4 | REST v3 / v4 | Sincronización de eventos y manipulación de hojas de cálculo |
| **Persistencia** | LocalStorage + React Store | Nativo | Estado reactivo local con migraciones de esquema |

---

## 3. Estructura del Código

```text
TimeTrack/
├── .env.example               # Variables de entorno de referencia (Gemini API, URL)
├── .gitignore                 # Reglas de exclusión de Git (dist, node_modules, .env, etc.)
├── firebase-applet-config.json# Configuración del cliente web de Firebase Auth
├── index.html                 # Punto de entrada HTML con meta viewport y título
├── metadata.json              # Metadatos del entorno de desarrollo
├── package.json               # Dependencias, scripts de compilación y linters
├── tsconfig.json              # Configuración de TypeScript (ES2022, bundler)
├── vite.config.ts             # Configuración de Vite (Tailwind plugin, allowedHosts)
├── README.md                  # Documentación introductoria del repositorio
├── PROJECT.md                 # Este documento (especificación completa para agentes)
└── src/
    ├── main.tsx               # Montaje del Virtual DOM en #root
    ├── index.css              # Reglas CSS base (@import "tailwindcss") y botones Google
    ├── App.tsx                # Componente principal: vistas, navegación, modales y lógica UI
    ├── data/
    │   └── store.ts           # Hook central de estado (useTimeTrackStore), tipos y reglas
    └── services/
        ├── googleAuth.ts      # Inicialización de Firebase Auth y token en memoria
        └── googleWorkspace.ts # Clientes REST para Calendar API y Sheets API
```

---

## 4. Mapa Detallado de Módulos y Responsabilidades

### `src/data/store.ts`
Contiene la única fuente de verdad para el estado de la aplicación (`useTimeTrackStore`), las definiciones de tipos TypeScript y la lógica de negocio pura:
- **Modelos de Datos**:
  - `User`: `{ id, name, email, role: 'Admin' | 'Employee', avatar? }`
  - `Project`: `{ id, name, client, color, active: boolean }`
  - `Task`: `{ id, projectId, name, description, estimatedHours, assignedTo, status, dueDate? }`
  - `TimeEntry`: `{ id, userId, projectId, taskId, date, startTime, endTime, durationMinutes, note, source, calendarEventId? }`
  - `CalendarEvent`: `{ id, title, startTime, endTime, date, matchedProjectId?, matchedTaskId?, status }`
  - `SystemSettings`: `{ lockDays: number, companyDomain: string }`
  - `TimerState`: `{ taskId: string | null, startTime: string | null (ISO) }`
- **Helpers de Zona Horaria (`America/Bogota`)**:
  - `getBogotaDateString(dateOffset)`: Retorna fecha actual formateada en `YYYY-MM-DD`.
  - `getBogotaTimeString(dateObj)`: Retorna hora en formato `HH:MM` (normaliza edge cases como `24:00` a `23:59`).
  - `getBogotaWeekDates()`: Retorna el array de 7 fechas (`YYYY-MM-DD`) de lunes a domingo de la semana en curso.
- **Acciones y Métodos del Store**:
  - `startTimer(taskId)` / `stopTimer(save, note)`: Control del temporizador único; calcula minutos transcurridos en Bogotá y valida cruces de horario.
  - `addTimeEntry` / `updateTimeEntry` / `deleteTimeEntry`: CRUD de registros con validaciones estrictas (duración positiva, bloqueo por antigüedad `lockDays`, sin solapamiento de horarios para el mismo usuario).
  - `syncGoogleCalendar(accessToken)`: Consulta eventos reales en Google Calendar (±7 días), auto-extrae tareas para eventos `[Proyecto] Tarea` si el proyecto existe, deduplica contra `entries` registradas y actualiza `tt_last_calendar_sync`.
  - `confirmCalendarSuggestion(eventId)` / `discardCalendarSuggestion(eventId)`: Conversión en 1 clic de evento a `TimeEntry` y descarte persistente.
  - `importProjectsAndTasksFromSheet(incomingProjects, incomingTasks)`: Inserción y actualización masiva de proyectos y tareas provenientes de Google Sheets sin generar duplicados por nombre.
  - `extractTasksFromCalendarEvents(selections)`: Creación directa de tareas a partir de eventos de calendario seleccionados.
  - `upsertAuthenticatedUser(fbUser)`: Sincronización del usuario de Google con el directorio de colaboradores, asignación automática del primer usuario como `Admin` y validación opcional del dominio corporativo.

### `src/services/googleAuth.ts`
- Inicializa Firebase Auth consumiendo `/firebase-applet-config.json`.
- Configura `GoogleAuthProvider` con los scopes:
  - `https://www.googleapis.com/auth/calendar.events` (lectura/escritura de eventos de calendario).
  - `https://www.googleapis.com/auth/spreadsheets` (creación y lectura de hojas de cálculo).
- **Gestión de Tokens Segura**: El token OAuth (`accessToken`) se almacena **estrictamente en memoria** (`cachedAccessToken`). **Nunca** se persiste en `localStorage` o cookies.
- Provee métodos `googleSignIn()`, `getAccessToken()`, `clearAccessToken()`, `logout()` e `initAuth()`.

### `src/services/googleWorkspace.ts`
- `fetchGoogleCalendarEvents(accessToken, timeMinIso, timeMaxIso)`: Consulta `GET /calendar/v3/calendars/primary/events`, formatea inicio/fin a `America/Bogota` y omite eventos de día completo sin hora.
- `createGoogleCalendarEvent(accessToken, payload)`: `POST /calendar/v3/calendars/primary/events` con zona horaria `-05:00` e invitados opcionales.
- `exportReportToGoogleSheets(accessToken, title, rows)`: Crea una nueva hoja (`POST /v4/spreadsheets`), resuelve el nombre real de la primera pestaña dinámicamente mediante metadata (evitando hardcodear `"Sheet1"`) y escribe los datos (`PUT /v4/spreadsheets/{id}/values/...`).
- `extractSpreadsheetId(input)`: Función utilitaria que extrae el ID de una hoja a partir de una URL completa de Google Docs o de un ID en texto plano.
- `fetchSpreadsheetMetadata(accessToken, spreadsheetId)`: Retorna el título y los nombres de todas las pestañas de una hoja de cálculo.
- `fetchSheetRows(accessToken, spreadsheetId, sheetTitle)`: Lee el rango `A1:Z500` de la pestaña especificada.
- Clase de error especializada: `GoogleAuthExpiredError` (captura códigos 401/403 de Google y desencadena la reconexión en 1 clic).

### `src/App.tsx`
- **Control de Vistas (Tabs)**:
  1. `week` ("Mi Semana"): Indicadores semanales, horas por día (gráfico interactivo), tareas asignadas pendientes listas para medir y banner de sugerencias de Google Calendar.
  2. `projects` ("Proyectos"): Tarjetas de proyectos con indicador de progreso de tareas, horas acumuladas, CRUD de proyectos y botón **Importar de Google Sheets**.
  3. `tasks` ("Tareas"): Tablero tipo Kanban organizado en columnas (*Por hacer*, *En progreso*, *Terminadas*). **Todas las tareas disponen de botón Medir / Detener** y comparativo `Est` vs `Reg`. Botón **Extraer de Calendar**.
  4. `entries` ("Historial de Horas"): Tabla completa con filtros, cálculo de duraciones, edición y eliminación (con respeto de reglas de bloqueo).
  5. `calendar` ("Google Calendar"): Vista de eventos de calendario sincronizados, indicador de coincidencia con proyectos/tareas, botón para confirmar sugerencias, botón **Crear tarea** y descartar.
  6. `reports` ("Reportes" - Admin): Filtros por rango de fechas (semana, mes, personalizado), selector de colaborador y proyecto, horas por colaborador, comparativa estimado vs. real, planilla semanal y exportación a **CSV / Excel** o **Google Sheets**.
  7. `settings` ("Configuración" - Admin): Configuración de días de bloqueo (`lockDays`), restricción de dominio `@empresa.com`, gestión de equipo y asignación de roles.
- **Temporizador en Header**: Muestra en tiempo real (`HH:MM:SS`) la tarea activa y el proyecto asociado, con acceso directo para detener y registrar notas.
- **Sistema de Modales y Diálogos**:
  - Modal para detener temporizador y registrar notas.
  - Modal de entrada manual de tiempo.
  - Modal de creación / edición de proyectos.
  - Modal de creación / edición de tareas.
  - Modal de importación de proyectos desde Google Sheets (con previsualización y selector de pestaña).
  - Modal de extracción de tareas desde eventos de Google Calendar.
  - Diálogo de confirmación interno (`ConfirmDialog`) para acciones destructivas o mutaciones externas en Google Workspace.
  - Sistema de notificaciones no intrusivas (`Toast`).

---

## 5. Invariantes del Sistema y Reglas de Negocio (Crítico para Agentes)

Cualquier agente que modifique o extienda el código debe respetar estrictamente estas reglas:

1. **Zona Horaria Mandatoria (`America/Bogota`)**:
   - Nunca utilizar `new Date().toISOString().split('T')[0]` o métodos locales del navegador directamente para representar fechas en el store.
   - Utilizar siempre `getBogotaDateString()`, `getBogotaTimeString()` o formateadores con `timeZone: 'America/Bogota'`.

2. **Seguridad y Ciclo de Vida del Token OAuth**:
   - El token OAuth emitido por Google **debe permanecer únicamente en memoria**.
   - No persistir el token en `localStorage` ni en cookies.
   - Si una llamada a Google Calendar o Sheets arroja `401` o `403`, el código debe capturar `GoogleAuthExpiredError`, invalidar `accessToken` a `null` y permitir al usuario reconectar con 1 clic mediante `googleSignIn()`.

3. **Medición Universal de Tareas**:
   - **Toda tarjeta de tarea debe poder medirse**. No condicionar la aparición del botón `Medir` / `Detener` exclusivamente a que la tarea pertenezca al usuario activo o esté en estado distinto a `Done`.
   - Solo puede haber **un temporizador activo a la vez** en todo el sistema.

4. **Sincronización de Calendar y Tareas**:
   - El patrón de emparejamiento automático es `[Proyecto] Tarea` (case-insensitive).
   - Un evento del calendario **nunca se convierte en entrada de tiempo automáticamente**; siempre requiere confirmación explícita del usuario o importación manual.
   - Las tareas extraídas desde el calendario se vinculan al proyecto seleccionado y toman como estimación inicial la duración del evento.

5. **Integración con Google Sheets**:
   - Al escribir reportes o leer hojas, **nunca asumir que la primera pestaña se llama `"Sheet1"` o `"Hoja 1"`**. Se debe consultar la metadata del spreadsheet y tomar el título real (`sheets[0].properties.title`).
   - Al importar proyectos, normalizar encabezados eliminando tildes y mayúsculas (`proyecto`, `cliente`, `color`, `estado`, `tarea`, `horas`).

6. **Entorno de Ejecución en Iframe / Sandbox**:
   - Está prohibido el uso de `window.alert()`, `window.confirm()` o `window.prompt()`. Cualquier confirmación debe utilizar el componente `ConfirmDialog`.
   - No forzar recargas completas de ventana (`window.location.reload()`).

7. **Validaciones de Tiempo**:
   - No se permiten duraciones negativas o cero (`endTime > startTime`).
   - No se permiten cruces u solapamientos de horario para el mismo usuario en la misma fecha.
   - Las entradas con más de `settings.lockDays` días de antigüedad quedan bloqueadas para edición/eliminación (salvo para usuarios con rol `Admin`).

---

## 6. Instrucciones de Ejecución y Comandos de Desarrollo

El agente harness puede ejecutar los siguientes comandos estándar para preparar, verificar y compilar la aplicación:

```bash
# 1. Instalación de dependencias
npm install

# 2. Ejecutar el linter y comprobación de tipos TypeScript
npm run lint

# 3. Compilación de producción (Vite build)
npm run build

# 4. Servidor de desarrollo local (puerto 3000 por defecto)
npm run dev
```

### Comprobación de Servidor en Segundo Plano
El servidor de desarrollo corre en `http://localhost:3000` con `host: 0.0.0.0` y tiene configurado `allowedHosts: true as const` en `vite.config.ts` para permitir peticiones desde entornos sandboxed y proxies web.

---

## 7. Checklist de Verificación y Pruebas para Agentes

Antes de entregar cualquier cambio en el repositorio, el agente debe verificar los siguientes puntos:

- [ ] **Compilación limpia**: `npm run build` finaliza con código 0 sin advertencias críticas de TypeScript.
- [ ] **Typecheck sin errores**: `npm run lint` (`tsc --noEmit`) pasa sin errores de tipos.
- [ ] **Persistencia Local**: La carga inicial no regenera datos de demostración si `tt_clean_workspace_v1` está presente.
- [ ] **Timer Activo**: Al presionar `Medir` en cualquier tarea, el temporizador en el header inicia su conteo y se actualiza cada segundo.
- [ ] **Detención del Timer**: Al detener el temporizador, se abre el modal para ingresar una nota y el registro se añade al historial.
- [ ] **Importación desde Sheets**: El parser maneja correctamente hojas con o sin columnas de tareas y mapea colores válidos de Tailwind.
- [ ] **Zona Horaria**: Los reportes y la planilla semanal agrupan correctamente los días lunes a domingo de acuerdo con la hora de Bogotá.

---

## 8. Arquitectura de Futura Extensión (Roadmap a Producción)

Para equipos que requieran sincronización remota multiusuario en tiempo real:

1. **Persistencia Backend (Cloudflare Workers + D1 / Firestore)**:
   - Reemplazar las operaciones de `localStorage` en `store.ts` por un cliente API REST o SDK de base de datos en la nube.
   - Almacenar proyectos, tareas y entradas asociadas al `tenant` o dominio corporativo.
2. **Sincronización en Segundo Plano (Cron)**:
   - Configurar un Cloudflare Worker Cron Trigger o Cloud Function para sincronizar eventos de Calendar mediante Service Accounts o refresh tokens guardados de forma segura.
3. **Despliegue en Cloudflare Workers**:
   - Como la aplicación es una SPA compilada por Vite, puede desplegarse directamente con **Cloudflare Workers Static Assets** (`dist/`) o **Cloudflare Pages**.

---

## How we build

Delivery is **spec-driven** and phased (see [docs/roadmap.md](./docs/roadmap.md)).

| Path | Purpose |
|------|---------|
| [docs/specs/](./docs/specs/README.md) | Per-change specs (stories, AC, test mapping) |
| [docs/decisions/](./docs/decisions/README.md) | ADRs (architecture choices) |
| [docs/spec-driven-development.md](./docs/spec-driven-development.md) | Workflow and templates |
| [AGENTS.md](./AGENTS.md) | Agent commands and **spec-first** rule |
| [.github/pull_request_template.md](./.github/pull_request_template.md) | PR checklist (spec link, invariants) |

Before implementing a feature: read or write the matching `SPEC-NNN` file; after merge, set `status: implemented` when acceptance criteria are verified.
