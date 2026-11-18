# TimeTrack — Control de Tiempo y Tareas (Google Workspace)

Aplicación web moderna y colaborativa para el seguimiento del tiempo de trabajo y la gestión de tareas de equipos integrados con **Google Workspace**.

Diseñada para equipos que necesitan visibilidad transparente de horas trabajadas por proyecto y tarea, integración directa con **Google Calendar** y sincronización bidireccional con **Google Sheets**.

---

## Características Principales

- **Inicio de sesión con Google (OAuth 2.0)**: Autenticación rápida con cuentas de Google, con opción de restringir el acceso a un dominio corporativo específico (ej. `@tuempresa.com`).
- **Roles y Permisos**:
  - **Admin**: Gestión integral de proyectos, tareas, directores de equipo, roles, políticas de cierre de período y acceso a reportes globales con exportación.
  - **Empleado**: Vista *"Mi Semana"*, temporizador personal, visualización de tareas asignadas y confirmación de sugerencias de calendario.
- **Medición de Tiempo Universal**:
  - Temporizador en vivo ubicado en el encabezado (único por usuario, con visualización de segundos y tarea en curso).
  - Todas las tareas del tablero tienen su botón de **Medir** disponible.
  - Registro manual con validación contra cruces de horario y duraciones negativas.
  - Política de cierre de períodos (`lockDays`) para impedir modificaciones en registros pasados.
- **Integración con Google Calendar**:
  - Lectura de eventos en tiempo real dentro de una ventana de ±7 días (Zona horaria `America/Bogota` GMT-5).
  - Auto-detección del patrón `[Proyecto] Tarea` para emparejamiento automático.
  - Sugerencias listas para confirmar en 1 clic como entradas de tiempo reales (sin registrar nada automáticamente sin autorización).
  - Extracción de eventos de calendario para convertirlos en tareas del proyecto.
- **Integración con Google Sheets**:
  - **Importación masiva**: Trae proyectos (nombre, cliente, color, estado) y tareas estimadas a partir del enlace de cualquier hoja de cálculo de Google.
  - **Exportación de reportes**: Crea hojas de cálculo de reporte en Google Sheets o descarga archivos CSV para Excel.
- **Reportes y Planilla Semanal**:
  - Gráficos de dedicación diaria, horas por colaborador y comparación entre horas estimadas vs. reales por proyecto.
  - Planilla detallada de lunes a domingo.

---

## 🛠️ Tecnologías Utilizadas

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Lucide React, Motion.
- **Build & Servidor:** Vite 8.
- **Autenticación & APIs:** Firebase Auth (Google OAuth), Google Calendar API v3, Google Sheets API v4.
- **Zona Horaria Oficial:** `America/Bogota` (GMT-5).

---

## 🚀 Inicio Rápido

### Prerrequisitos
- Node.js 18+ o 20+
- npm o bun

### Instalación y Ejecución

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/felipetdk7/TimeTrack.git
   cd TimeTrack
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Ejecutar en modo de desarrollo:**
   ```bash
   npm run dev
   ```
   La aplicación estará disponible en `http://localhost:3000`.

4. **Comprobar tipos y compilar para producción:**
   ```bash
   npm run lint
   npm run build
   ```

---

## 🤖 Documentación para Agentes de IA y Harnesses

Si estás abriendo este repositorio utilizando un agente de desarrollo o harness autónomo (como Cursor, Claude Code, Devin, Antigravity, SWE-bench o Aider), consulta los siguientes documentos:

- **[PROJECT.md](./PROJECT.md)**: Especificación técnica completa, arquitectura, reglas de negocio e invariantes del sistema.
- **[AGENTS.md](./AGENTS.md)**: Instrucciones rápidas y comandos para agentes.

---

## 📄 Licencia

Este proyecto se distribuye bajo la licencia Apache-2.0.
