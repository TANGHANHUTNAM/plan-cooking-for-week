<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- b-init-managed:start -->

## Repository Purpose

PlanFoodInWeek is a Vietnamese, mobile-first family meal-planning app for weekly meal scheduling, food and ingredient management, smart randomization, shopping aggregation, and household attendance/settings. **Evidence:** `README.md`, `docs/spec.md`.

## Project Profile

- **Framework and language scope** — The application uses Next.js 16.3.3 App Router, React 19.2.8, and strict TypeScript; route entry points are under `src/app`, with the Next 16 proxy entry at `src/proxy.ts`. **Evidence:** `package.json`, `tsconfig.json`, `src/app/`, `src/proxy.ts`.
- **UI and design scope** — Tailwind CSS v4 and shadcn/ui are the UI foundations. For requirements and design decisions, `docs/spec.md` owns feature intent and `docs/DESIGN.md` owns implementation design; current code and configuration are authoritative when historical notes differ. **Evidence:** `package.json`, `components.json`, `src/app/globals.css`, `docs/spec.md`, `docs/DESIGN.md`.
- **Formatting scope** — Prettier configuration is canonical in `.prettierrc.json`; the repository exposes the formatting check through its package script. **Evidence:** `.prettierrc.json`, `package.json`.
- **Lint scope** — ESLint 9 uses the Next core-web-vitals and TypeScript presets from `eslint.config.mjs`; that file is the lint standard. **Evidence:** `eslint.config.mjs`, `package.json`.
- **Type-checking scope** — `tsconfig.json` is the type standard: strict checking, no emit, bundler module resolution, and the `@/*` path alias are configured there. **Evidence:** `tsconfig.json`.
- **Test scope** — Vitest is configured for the Node environment and discovers `src/**/*.test.ts`; `vitest.config.ts` is the test configuration source. **Evidence:** `vitest.config.ts`, `package.json`.
- **Auth boundary scope** — `/login` is the public route; `src/proxy.ts` gates the other matched routes by validating `pf_session` through `src/lib/session.ts`. Server actions should retain an equivalent session check before accepting mutations, as demonstrated by the import actions. **Evidence:** `src/proxy.ts`, `src/lib/session.ts`, `src/actions/import.ts`.
- **Prisma/database scope** — The Prisma schema and migrations define persistence; `prisma.config.ts` supplies the CLI datasource URL, while `src/lib/prisma.ts` creates the runtime client from `DATABASE_URL`. **Evidence:** `prisma/schema.prisma`, `prisma/migrations/`, `prisma.config.ts`, `src/lib/prisma.ts`.
- **Excel-import scope** — `src/actions/import.ts` parses and previews `.xlsx` input before a second action validates again and writes in a transaction; the server action upload limit is configured in `next.config.ts`. **Evidence:** `src/actions/import.ts`, `src/lib/import-foods.ts`, `next.config.ts`.
- **CI scope** — No repository CI configuration was found in the root inventory, so CI standards and automation are not currently specified. **Evidence:** root repository inventory; no `.github` or other CI configuration was present.

## Project Map and Ownership

- **Navigation and feature scope** — `src/app/` owns route pages, layouts, loading states, metadata, the manifest, and the Excel template route; `src/components/` owns reusable and interactive UI, including `ui/`; `src/actions/` owns server actions for auth, foods, imports, members, and plans; `src/lib/` owns shared queries, validation, session, Prisma access, week/randomization/shopping logic, and app metadata. **Evidence:** `src/app/`, `src/components/`, `src/actions/`, `src/lib/`.
- **Persistence and asset scope** — `prisma/schema.prisma` is the database model source, `prisma/migrations/` stores migration history, `prisma/seed.ts` owns seed data, `public/` owns static assets, and `docs/` owns the feature specification and implementation design notes. **Evidence:** `prisma/schema.prisma`, `prisma/migrations/`, `prisma/seed.ts`, `public/`, `docs/`.
- **Generated-output scope** — The Prisma generator writes `src/generated/prisma/` from `prisma/schema.prisma`; `scripts/format-generated.mjs` formats that output. Treat `src/generated/prisma/` as generated and edit the schema or generator/formatting inputs instead of generated files. **Evidence:** `prisma/schema.prisma`, `scripts/format-generated.mjs`, `package.json`, `src/generated/prisma/`.
- **Local edit-boundary scope** — Put route changes in `src/app/`, UI changes in `src/components/`, server mutations in `src/actions/`, shared logic in `src/lib/`, persistence changes in `prisma/` with matching migrations or seed updates when applicable, and static assets in `public/`. When a change makes a recorded project fact stale or introduces a durable purpose, convention, boundary, ownership rule, map entry, or verification command, update the relevant managed fact in this `AGENTS.md` in the same change; otherwise leave it unchanged. **Evidence:** repository layout, `prisma/`, `src/`, `public/`, `package.json`.

## Verification

- `npm install` — install dependencies; the existing `postinstall` lifecycle script generates Prisma client output and formats it.
- `npm run postinstall` — run the existing Prisma generation and generated-output formatting lifecycle script explicitly.
- `npm run prepare` — run the existing Husky setup hook.
- `npm run dev` — start the Next.js development server.
- `npm run build` — create the production build.
- `npm run start` — serve the production build.
- `npm run lint` — run ESLint.
- `npm run typecheck` — run strict TypeScript checking without emitting files.
- `npm run test` — run the Vitest suite.
- `npm run format:check` — check repository formatting with Prettier.
- `npm run db:migrate` — run the configured Prisma development migration command.
- `npm run db:seed` — run the configured Prisma seed command.
- `npm run db:studio` — open Prisma Studio.
- **Focused gap:** no CI command or configuration is currently defined in the repository; add one only when the project adopts automated CI.

<!-- b-init-managed:end -->
