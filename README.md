# PlanFoodInWeek 🍲

The PlanFoodInWeek weekly family meal-planning app — _"Open the app quickly, know what's for today, who is eating, and what needs to be prepared."_

- **Today** — 2 lunch/dinner meals for the day, ingredients to prepare, and the **"Đã nấu"** button (the system learns eating habits from this).
- **Weekly calendar** — Monday→Sunday, smart **Randomize week** (score = favorites + frequency + time since last meal + randomness; no dish repeats during the week), **Copy previous week**, and swapping individual dishes through a bottom sheet.
- **Foods** — CRUD for main/side dishes, ingredients, and 0–5-star ratings.
- **Shopping** — collect ingredients for the week, merge duplicates, and tick off purchased items (stored locally).
- **Settings** — account, statistics, and sign out.

Documentation: [visual design standard](./docs/DESIGN.md) · [technical architecture](./docs/architecture.md) · [feature requirements](./docs/spec.md)

## Stack

Next.js 16 (App Router, Server Actions, proxy.ts) · React 19 · TypeScript · Tailwind CSS v4 + shadcn/ui · Prisma 7 (driver adapter `@prisma/adapter-pg`) · PostgreSQL on Supabase · Custom auth (bcryptjs + JWT via `jose`, httpOnly cookie renewed automatically for 90 days).

**Four family-member accounts** (pre-seeded, all using the same password `admin123123!`): `nam@gmail.com`, `khang@gmail.com`, `dat@gmail.com`, `bao@gmail.com` — no registration or password reset, and no access control (the old admin account `thucdon@gmail.com` was removed as requested). The whole family shares **one weekly meal plan**; each meal has a member chip to mark **who is not eating** (the `meal_absences` table, with everyone eating by default). Delete an account in **Settings → Family members** (deleting the last account is blocked; deleting your own account signs you out).

## Run the project

```bash
npm install            # automatically runs prisma generate (postinstall)
npm run dev            # http://localhost:3000
```

`.env` requires 3 variables (see `.env.example`): `DATABASE_URL` (Supabase pooler, port 6543), `DIRECT_URL` (port 5432 — used for migrate/seed), and `AUTH_SECRET` (a random string ≥ 32 characters).

## Scripts

| Command                           | Task                                                                              |
| --------------------------------- | --------------------------------------------------------------------------------- |
| `npm run dev` / `build` / `start` | Dev server / production build / run in production                                 |
| `npm test`                        | Unit tests (Vitest) for the random engine + week processing                       |
| `npm run db:migrate`              | `prisma migrate dev` (via `DIRECT_URL`)                                           |
| `npm run db:seed`                 | Seed admin + 18 sample dishes (idempotent — rerunning does not create duplicates) |
| `npm run db:studio`               | Prisma Studio for viewing data                                                    |

## Technical notes

- All “today/this week” calculations use the `Asia/Ho_Chi_Minh` time zone (`src/lib/week.ts`) — the server can run in UTC and still resolve the correct local day.
- The random engine is a pure function in `src/lib/random-engine.ts`; when the pool contains too few dishes it relaxes the constraints but **never repeats a dish on the same day** and distributes repeats evenly.
- Prisma 7: the URL is configured in `prisma.config.ts` (the CLI uses `DIRECT_URL`), while runtime uses the pg adapter with `DATABASE_URL`.
