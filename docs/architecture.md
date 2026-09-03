# Technical architecture — current implementation

> `docs/spec.md` is the feature-requirements authority. [DESIGN.md](./DESIGN.md) is the visual standard. This document records the technical shape and invariants currently implemented; it is not a second product roadmap.

## Runtime and route shape

- Next.js 16.3.3 App Router with React 19, TypeScript, Tailwind CSS v4, shared shadcn/Radix UI components, Lucide icons, and Sonner toasts.
- `src/app/layout.tsx` owns document metadata, Vietnamese font loading, theme provider, tooltip provider, and toaster. The authenticated shell is `src/app/(app)/layout.tsx`.
- `/login` is public. `/`, `/week`, `/foods`, `/shopping`, and `/settings` are the app routes. `src/app/(app)/foods/template/route.ts` generates the Excel template.
- `src/proxy.ts` guards the matched app routes and redirects unauthenticated requests to `/login`; an authenticated `/login` request redirects to `/`.

## Ownership map

| Concern                                   | Current source of truth                                             |
| ----------------------------------------- | ------------------------------------------------------------------- |
| Route-level server components             | `src/app/`                                                          |
| Reusable and interactive UI               | `src/components/`                                                   |
| Server mutations                          | `src/actions/`                                                      |
| Reads and DTO serialization               | `src/lib/queries.ts`, `src/lib/dto.ts`                              |
| Session and date/week rules               | `src/lib/session.ts`, `src/lib/week.ts`                             |
| Random selection and shopping aggregation | `src/lib/random-engine.ts`, `src/lib/shopping.ts`                   |
| Shared validation                         | `src/lib/validations.ts`                                            |
| Persistence                               | `prisma/schema.prisma`, `prisma/migrations/`                        |
| Runtime Prisma client                     | `src/lib/prisma.ts` and generated output in `src/generated/prisma/` |
| Seed data                                 | `prisma/seed.ts`                                                    |

Generated Prisma output is disposable: never edit `src/generated/prisma/` directly. A schema change requires a matching migration and regenerated client; generator-only changes require regeneration but not a migration.

## Server/client boundaries

Protected app pages authenticate with `getSession()`, read through query helpers, and map dates/database records to serializable DTOs before passing data to client components. Client components own forms, sheets, toggles, local state, and optimistic attendance/shopping feedback; durable state is written through authenticated Server Actions, not browser storage. Authenticated domain mutations repeat the session check, validate shared inputs where applicable, perform the write, and call `revalidatePath("/", "layout")` (shopping mutations revalidate `/shopping`); the login/logout entry and exit actions are intentional exceptions.

Excel import is intentionally two-stage: `parseImportExcel` validates and previews rows without writing, then `importFoods` validates the submitted rows again and writes foods, ingredients, and statistics in a transaction. The action accepts `.xlsx`, limits files to 4MB through `next.config.ts`, and limits imports to 200 rows.

## Persistence invariants

- `FoodType` is `MAIN` or `SIDE`; `MealPeriod` is `LUNCH` or `DINNER`. A food owns ingredients and one optional `FoodStatistic` record.
- A `MealPlan` is shared by the household and is unique by `weekStart`; it no longer has an owner foreign key. A meal is unique by plan/date/period and stores `cookedAt` plus an optional household `note`.
- `MealItem` is unique by meal/position. Generated meals always have a main dish; a side dish is optional and can be removed or added by the plan actions. The schema does not encode the “main is required” rule, so actions/UI must preserve it.
- `MealAbsence` is a join row meaning that a member does **not** eat a meal. No row means the member eats by default. Its meal/member uniqueness and cascade behavior are schema invariants.
- `PlanSnapshot` keeps a JSON copy of one week's meals (dishes, dish names, notes, cooked timestamps, absence ids) written immediately before a whole-week write replaces them, tagged with `reason` (`RANDOM_WEEK`, `COPY_LAST_WEEK`, `RESTORE`). Rows are per `weekStart`, capped at `PLAN_SNAPSHOT_KEEP` in `src/lib/plan-history.ts`, and are undo history rather than an archive. The payload shape is owned by that module; the column is untyped JSON, so reads parse defensively and drop unreadable entries.
- `ShoppingIngredientCheck` stores the presence of a normalized ingredient key for a selected `weekStart`; one row is shared by every authenticated household member and one check covers every duplicate ingredient display in that week.
- `ShoppingExtra` stores a shared, date-keyed item with its purchased state. The shopping page queries the selected week (and Sunday’s next-day boundary when needed), then filters extras to the active scope.
- Deleting a food cascades its ingredients, statistics, and scheduled meal items. Deleting a member cascades their absence rows; the shared plan and foods remain.
- Dates use `Asia/Ho_Chi_Minh` through `src/lib/week.ts`, travel through the app as `yyyy-MM-dd`, and map to UTC midnight for Prisma `@db.Date`. Weeks run Monday through Sunday.

## Authentication and household access

Authentication is a compact custom flow in `src/actions/auth.ts` and `src/lib/session.ts`: bcrypt verifies passwords, a JWT is signed with HS256, and the `pf_session` httpOnly cookie lasts 90 days with sliding renewal after 30 days. `getSession()` is required for protected app pages and authenticated domain mutations; the login/logout entry and exit actions intentionally do not require an existing session. There is no role-based access control; authenticated family members share the same plan and food data, and any signed-in member can create an account for someone else — `createMember` in `src/actions/members.ts` validates with `memberSchema`, lowercases the unique email, and hashes with the same bcrypt cost as the seed, so a new account logs in immediately. `deleteMember` refuses the caller’s own account: removing an account is always somebody else’s action, so nobody can lock themselves out or lose their session mid-use. It still blocks deleting the last account. The UI mirrors this by omitting the delete control on your own row.

## Meal planning behavior

`src/lib/random-engine.ts` is pure and unit-testable. It scores favorite rating (2.0), logarithmic cooked frequency (1.5), staleness capped at 30 days (1.5), and a random factor (1.0), then chooses with weighted randomness from the top five. Main and side pools are separate. Week generation avoids repeats while pools allow, avoids same-day repeats when relaxing an exhausted pool, and uses repeat counts to distribute constrained pools. An empty side pool produces main-only assignments.

`generateWeek` and `copyLastWeek` replace a target week’s meals inside a transaction. Copying shifts the previous week’s items by seven days and creates fresh meals, so cooked state, attendance rows, and meal notes are not carried over. Individual swaps validate the food type; side removal/addition is handled by dedicated actions.

Both whole-week writes snapshot the plan they are about to destroy: the current meals are read outside the transaction (keeping the destructive transaction as short as the remote database needs), the row is inserted inside it so a failed write leaves no orphan history, and pruning runs afterwards as best-effort housekeeping. An empty week produces no snapshot, so the action reports no `snapshotId` and the UI offers no undo. `restorePlanSnapshot` rebuilds the week from a snapshot — dropping dishes and absences whose food or member has since been deleted, and reporting how many dishes were skipped — and snapshots the plan it replaces, so restoring is itself undoable. Cooked timestamps are restored verbatim because `FoodStatistic` is never decremented when a plan is wiped, which keeps the totals consistent.

`markCooked` stores one meal-level completion timestamp and updates statistics for every item in that meal. `undoCooked` reverses the counts and recalculates each affected food’s latest cooked timestamp. `src/lib/shopping.ts` aggregates duplicate ingredient names with the same normalized case-insensitive key. Shopping checks persist in `shopping_ingredient_checks` by selected `weekStart` (no `localStorage`); the current-week default is “Tối nay và trưa mai”, including the next week’s lunch when the boundary is Sunday. The `Mua thêm` list persists shared `shopping_extras` by calendar date and is shown only for dates in the active scope.

## Intentional differences and extensions from `spec.md`

These are current implementation decisions, not future work:

- The app uses Next.js 16 and `src/proxy.ts` rather than the Next.js 15/middleware shape named by the original spec. Prisma 7 uses `prisma.config.ts` and the PostgreSQL driver adapter at runtime.
- `User.passwordHash` exists for login. `FoodStatistic.weekly_count` is not stored; the current implementation keeps total/last-cooked statistics and derives other views from meals.
- The meal plan is household-shared rather than user-owned, with multiple family accounts and per-meal absence marking.
- “Đã nấu” is meal-level (`Meal.cookedAt`) and updates all dishes in that meal. `favoriteScore` is the 0–5 favorite/rating field.
- Side dishes are optional per meal, meal notes are supported, and Excel import, theme selection, and member management (create an account for another member, delete anyone except yourself) are implemented additions.
- Whole-week randomize/copy is undoable: `plan_snapshots` holds recent versions of a week, the success toast offers `Hoàn tác`, and `Lịch sử` on the week page lists saved versions day by day for restoring. The spec did not ask for plan history; it exists because a mis-tapped `Random tuần` used to discard hand-edited days permanently.

When a behavior changes, update the relevant source first, then this document if the decision is durable. Do not copy implementation plans, credentials, or historical status into the design standard.
