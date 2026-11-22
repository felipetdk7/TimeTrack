# Specs (TimeTrack)

Per-change specifications: user stories, acceptance criteria, test mapping, and invariants.

**Process:** See [spec-driven-development](../../docs/spec-driven-development.md) in the Project store, or the summary in [ADR-001](../decisions/001-spec-driven-workflow.md).

| Step | Action |
|------|--------|
| Draft | Copy [000-template.md](./000-template.md) → `NNN-short-name.md` on a `feat/` branch |
| Review | Maintainer sets `status: approved` in the YAML header |
| Implement | PR links the spec and ticks AC in the description |
| Done | After merge/verify, set `status: implemented` |

## Index

| ID | File | Phase | Status |
|----|------|-------|--------|
| SPEC-001 | [001-demo-mode-baseline.md](./001-demo-mode-baseline.md) | 0 | see file |
| SPEC-002 | [002-quality-tooling.md](./002-quality-tooling.md) | 1 | draft |