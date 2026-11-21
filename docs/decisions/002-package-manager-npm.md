# ADR-002: npm with package-lock.json
Date: 2026-11-21  
Status: accepted

## Context

The repo had both `bun.lock` and `package-lock.json`. CI and Hostinger deploy docs already assume npm. Peer dependency warnings with esbuild require `npm install --legacy-peer-deps`.

## Decision

- **npm** is the canonical package manager for install and CI.
- Keep **`package-lock.json`**; remove **`bun.lock`** from the repository.
- Document `--legacy-peer-deps` in AGENTS.md and Cursor rules where install is mentioned.

## Consequences

- README should not recommend bun for installation.
- Unused server-side dependencies (`express`, `dotenv`, `@google/genai`) removed from `package.json` — they are not imported under `src/`.