# Agent Instructions & Guidelines (AGENTS.md)

Welcome to **TimeTrack**. This file provides quick instructions and operating rules for AI coding agents and harness runners. For the full system specification, see [PROJECT.md](./PROJECT.md).

## Spec-first

1. Find the task spec under `docs/specs/` (see [docs/specs/README.md](./docs/specs/README.md)) or draft one from [docs/specs/000-template.md](./docs/specs/000-template.md).
2. Do **not** change product behavior without updating the relevant spec (status + AC).
3. PRs must link the spec and check invariants (see [.github/pull_request_template.md](./.github/pull_request_template.md)).
4. Paradigm summary: [docs/spec-driven-development.md](./docs/spec-driven-development.md). Roadmap: [docs/roadmap.md](./docs/roadmap.md).

## Quick Commands
- **Install dependencies:** `npm install --legacy-peer-deps`
- **Lint (tests + ESLint + types):** `npm run lint` (`vitest run`, `eslint .`, `tsc --noEmit`)
- **Unit tests:** `npm run test`
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
