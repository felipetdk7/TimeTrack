---
id: SPEC-001
title: Demo mode baseline and repo hygiene
status: implemented
phase: 0
author: Jonathan
updated: 2026-11-21
---

## Context

TimeTrack is a client-only SPA. Teams need to try the UI without Google OAuth. Phase 0 also commits pending MVP work and establishes spec-driven workflow in-repo (see PROJECT.md).

## Goals / non-goals
- **Goal:** Demo login via `localStorage` flag `tt_demo_mode`, seeded sample data, no Google APIs required for core flows.
- **Goal:** Commit baseline app files, deploy notes, Cursor rules, and dependency hygiene (npm lock only).
- **Non-goal:** Firestore, Clockify, ESLint/Vitest (Phase 1).

## User stories
- As a **visitor**, I want to enter demo mode without Google so that I can explore projects, tasks, timer, and entries offline.
- As **maintainer**, I want demo data isolated from production keys so that secrets never land in git.

## Acceptance criteria
1. **AC-1:** Given no Google session, when the user chooses demo entry, then `tt_demo_mode` is set, sample users/projects/tasks/entries load, and Calendar/Sheets actions show appropriate messaging (no token required for browsing).
2. **AC-2:** Given this PR, then `src/App.tsx`, `src/data/store.ts`, `DEPLOY.md`, `public/.htaccess`, and `.cursor/rules/timetrack.mdc` are committed without API secrets or OAuth tokens.
3. **AC-3:** Given `package.json`, then `@google/genai`, `express`, and `dotenv` are removed; install uses `package-lock.json` only (`bun.lock` absent).
4. **AC-4:** Given the repository root, then `LICENSE` (MIT) exists and README license section matches.
5. **AC-5:** Given `docs/specs/`, `docs/decisions/`, PR template, and `docs/roadmap.md`, then they exist and describe phases 0–4.

## Invariants (must not break)
- America/Bogota for all date/time display and storage.
- OAuth access token remains in memory only — never `localStorage`.
- No `window.alert` / `confirm` / `prompt`; use Toast / ConfirmDialog.
- Calendar events never auto-create time entries without user confirmation.

## Test mapping
| AC | Automated (Vitest) | Manual |
|----|--------------------|--------|
| AC-1 | — (Phase 1+) | Dev server: demo login, navigate week/tasks, start/stop timer |
| AC-2 | — | Review git diff for secrets |
| AC-3 | — | `npm install --legacy-peer-deps` succeeds |
| AC-4 | — | Read LICENSE + README |
| AC-5 | — | File tree check |

## Files in scope (Phase 0 commit)
- `src/App.tsx` — demo entry UI, restore demo session on load
- `src/data/store.ts` — `enterDemoMode`, demo seed, legacy demo ID cleanup
- `DEPLOY.md` — static Hostinger deploy
- `public/.htaccess` — SPA fallback for Apache
- `.cursor/rules/timetrack.mdc` — agent invariants (no secrets)

## Open questions
- None for Phase 0.