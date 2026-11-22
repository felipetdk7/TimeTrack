## Spec

- **Spec:** <!-- e.g. docs/specs/001-demo-mode-baseline.md -->
- **Status:** <!-- draft | approved | implemented -->

## Acceptance criteria

- [ ] AC-1
- [ ] AC-2
- [ ] AC-3
- [ ] (add from spec)

## Invariants checked

- [ ] America/Bogota for dates/times (no raw `toISOString().split` for display dates)
- [ ] OAuth token only in memory — not in localStorage, cookies, or logs
- [ ] At most one active timer; Medir/Detener on Kanban and Mi Semana tasks
- [ ] Calendar → time entry only with explicit user confirmation
- [ ] Sheets: dynamic tab name (no hardcoded `Sheet1`)
- [ ] No `window.alert` / `confirm` / `prompt` / `location.reload`

## Verify

- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] Manual steps from spec (if any)

## Notes

<!-- screenshots, deploy impact, follow-ups -->