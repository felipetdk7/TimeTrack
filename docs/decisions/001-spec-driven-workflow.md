# ADR-001: Spec-driven workflow (Markdown in-repo)
Date: 2026-11-21  
Status: accepted

## Context

TimeTrack evolves through phased delivery (~15 users). We need traceability from behavior to reviewable specs without extra services. Agents and humans both contribute.

## Decision

- Use `docs/specs/*.md` with YAML frontmatter (`id`, `status`, `phase`).
- Use `docs/decisions/*.md` for ADRs.
- PRs must link the relevant spec and tick acceptance criteria (see `.github/pull_request_template.md`).
- `AGENTS.md` and `PROJECT.md` point agents to read specs before changing behavior.
- Full paradigm: `docs/spec-driven-development.md` (also summarized in Project Context).

## Consequences

- Spec status transitions: `draft` → `approved` (before large implementation) → `implemented` (after verify).
- Phase 1+ tests should reference AC IDs in names.
- No Spec Kit CLI required at start; optional later.