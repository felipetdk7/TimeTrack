---
id: SPEC-002
title: ESLint, Prettier, Vitest, CI, strict TS, App modularization
status: implemented
phase: 1
author: Jonathan
updated: 2026-11-22
---

## Context

Phase 1 raises baseline quality before Firestore (Phase 2). `App.tsx` was monolithic; store holds critical timezone and overlap rules that need automated tests.

## Goals / non-goals
- **Goal:** ESLint + Prettier, Vitest for `store.ts` helpers, GitHub Actions CI on PRs.
- **Goal:** Gradual TypeScript `strict`; split `App.tsx` into feature folders without behavior change.
- **Non-goal:** Changing business rules or adding backend.

## User stories
- As **developer**, I want CI to run lint, test, and build on every PR so that regressions are caught early.
- As **developer**, I want tests named after AC IDs so that specs trace to code.

## Acceptance criteria
1. **AC-1:** Bogotá week/date helpers have Vitest coverage (midnight edge, week boundaries).
2. **AC-2:** Overlap validation rejects intersecting entries for same user/day.
3. **AC-3:** `lockDays` blocks non-admin edits on old entries.
4. **AC-4:** Calendar title `[Proyecto] Tarea` parsing maps to project/task IDs.
5. **AC-5:** `.github/workflows/ci.yml` runs `npm ci`, lint, test, build on PR to `main`.
6. **AC-6:** `App.tsx` reduced to shell; features live under `src/features/*` and shared `src/components/*`.

## Invariants (must not break)
- Same as SPEC-001 and PROJECT.md § invariants.

## Test mapping
| AC | Automated (Vitest) | Manual |
|----|--------------------|--------|
| AC-1–4 | `src/data/store.test.ts` | Smoke checklist per PROJECT.md |
| AC-5 | CI | Green PR |
| AC-6 | — | Tab-by-tab smoke after each slice |

## Implementation notes
- Pure rules extracted to `src/data/storeRules.ts` (shared by store and tests).
- `npm run lint` runs `vitest run`, `eslint .`, and `tsc --noEmit`.
- Feature tab views receive a view-model bag (`TimeTrackAppVm`); typing tightens in later phases.
- Tab views use `@ts-nocheck` temporarily to keep strict app code while the VM is untyped.