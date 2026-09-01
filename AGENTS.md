<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- b-init-managed:start -->

## Repository Purpose

PlanFoodInWeek is a Vietnamese, mobile-first family meal-planning app for weekly meal scheduling, dish and ingredient management, smart randomization, shared household attendance, and aggregated shopping lists. Feature requirements live in [`docs/spec.md`](docs/spec.md), and implementation decisions live in [`docs/DESIGN.md`](docs/DESIGN.md).

## Project Operating Guide

### Architecture and change map

- Next.js App Router routes and route-level UI belong under `src/app/`; reusable UI belongs in `src/components/`; server mutations belong in `src/actions/`; shared queries, validation, session, week, randomization, shopping, and app metadata belong in `src/lib/`.
- `/login` is the public route. `src/proxy.ts` protects the rest of the matched app by validating the session through `src/lib/session.ts`; mutating server actions should keep an equivalent session check, following `src/actions/import.ts`.
- Excel import is deliberately two-stage: `src/actions/import.ts` previews `.xlsx` input with helpers from `src/lib/import-foods.ts`, then the confirmation action validates again and writes in a transaction. The upload limit is configured in `next.config.ts`.

### Canonical sources and generated output

- `docs/spec.md` owns feature requirements and `docs/DESIGN.md` owns implementation decisions; current source and configuration take precedence when older documentation differs.
- `prisma/schema.prisma` and `prisma/migrations/` are the persistence sources of truth. Runtime Prisma access is in `src/lib/prisma.ts`; schema changes require a matching migration. The generated client is under `src/generated/prisma/`: do not edit it directly, and run `npm run postinstall` when schema or generator inputs change.
- `src/lib/week.ts` centralizes date and week calculations in the `Asia/Ho_Chi_Minh` time zone; use it for today/week logic instead of server-local date assumptions.

## Verification

Run the applicable normal checks:

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run format:check`
- `npm run build`

No repository CI configuration or command is currently defined; CI coverage is a focused gap.

<!-- b-init-managed:end -->
