# Agent Instructions & Guidelines (AGENTS.md)

Welcome to **TimeTrack**. This file provides quick instructions and operating rules for AI coding agents and harness runners. For the full system specification, see [PROJECT.md](./PROJECT.md).

## Quick Commands
- **Install dependencies:** `npm install`
- **Typecheck & Lint:** `npm run lint` (`tsc --noEmit`)
- **Build Production:** `npm run build`
- **Development Server:** `npm run dev` (Port 3000, host `0.0.0.0`)

## Key Rules & Invariants
1. **Timezone:** Always calculate and format dates and times in `America/Bogota` (GMT-5). Never use raw browser UTC or local time strings directly.
2. **Tokens:** OAuth tokens for Google Calendar and Google Sheets must remain in memory (`cachedAccessToken`). Never store them in `localStorage`.
3. **Task Measurement:** ALL tasks on the Kanban board and "Mi Semana" must have the `Medir` / `Detener` button.
4. **Google Calendar:** Conventions are `[Proyecto] Tarea`. Never convert events to time entries automatically without user confirmation.
5. **Google Sheets:** Dynamically read the sheet tab name from metadata (never hardcode `"Sheet1"`).
6. **Iframe / Sandbox:** Never use `window.alert()`, `window.confirm()`, or `window.open()`. Use `Toast` or `ConfirmDialog`.
7. **Verification:** Always run `npm run lint` and `npm run build` before completing turns.
