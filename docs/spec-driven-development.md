# Spec-driven development (TimeTrack)

**Goal:** Good software patterns without bureaucracy. Every meaningful change starts as a short, reviewable spec; code and tests trace back to it.

---

## How it fits TimeTrack

| Artifact | Role |
|----------|------|
| `PROJECT.md` | Product scope, roles, global invariants (Bogotá TZ, one timer, no auto calendar entries, etc.) |
| `docs/specs/*.md` | **Per change:** stories, acceptance criteria, edge cases, test list |
| `docs/decisions/*.md` | ADRs: Firestore vs D1, Clockify token storage, npm vs bun |
| `AGENTS.md` | Commands + rule: read spec before coding; update spec when behavior changes |
| Vitest (Phase 1+) | Scenarios named to match spec section IDs (e.g. `SPEC-002 AC-2`) |

---

## Workflow

1. **Idea** → open issue or tracker note with one-line intent.
2. **Spec draft** → `docs/specs/NNN-short-name.md` on a `feat/` branch.
3. **Review** → maintainer marks spec `status: approved` in the file header.
4. **Implement** → PR links spec path and ticks acceptance criteria.
5. **Verify** → tests + manual steps; update spec `status: implemented` when merged.

---

## Templates

- Spec: [docs/specs/000-template.md](./specs/000-template.md)
- ADR: [docs/decisions/000-template.md](./decisions/000-template.md)

See also [ADR-001](./decisions/001-spec-driven-workflow.md).