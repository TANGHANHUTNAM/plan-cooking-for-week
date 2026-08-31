# Design plan — PlanFoodInWeek

> Requirements source: [docs/spec.md](./spec.md) (copied from `smart-weekly-meal-planner-spec.md`).
> The spec is the source of truth for **features**; this document is the source of truth for **implementation**. Update this document when technical decisions change.

## 1. Key decisions

| Item          | Decision                                                                                                                        | Rationale                                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Framework     | Next.js 15 (App Router, RSC + Server Actions), TypeScript                                                                       | Per spec §11; no separate REST API is needed                                                                     |
| UI            | Tailwind CSS v4 + shadcn/ui + lucide-react + sonner (toast)                                                                     | Per spec §11; Drawer (vaul) serves as the bottom sheet per spec §7, §12                                          |
| ORM / DB      | Prisma + PostgreSQL — **env provided by you**                                                                                   | Per spec §11                                                                                                     |
| Auth          | Compact custom auth: `bcryptjs` (password hashing) + JWT signed with `jose` in an `httpOnly` cookie, **90-day** limit           | Only 1 admin account → NextAuth is unnecessary; “remember login” = a long-lived cookie that renews automatically |
| Users         | **Exactly 1 admin**, pre-seeded: `thucdon@gmail.com` / `admin123123!`                                                           | Finalized requirement; no registration page or password reset                                                    |
| Language & UX | Vietnamese UI, mobile-first (a `max-w-md` frame centered on desktop), week starts on **Monday**, time zone **Asia/Ho_Chi_Minh** | Spec §12; primarily used on phones                                                                               |
| Font          | Be Vietnam Pro via `next/font/google`                                                                                           | Vietnamese diacritics render correctly                                                                           |
| Validation    | zod (shared schema for forms + server actions)                                                                                  | Less duplicated code                                                                                             |

### Intentional differences from the spec

1. `users` adds a `password_hash` column — the spec does not include one, but it is required for login.
2. The `food_statistics.weekly_count` column is removed — weekly frequency is **computed dynamically** from the `meals`/`meal_items` tables (more accurate, with no weekly reset job required).
3. "Đã nấu" is attached to the **meal** (`Meal.cookedAt`), not to each dish — one button updates statistics for both the main + side dish, matching the spec §6 description ("after the meal is completed").
4. `favorite` = a 0–5-star scale on `Food.favoriteScore` (0 = not yet favorited) — the spec's "mark as favorite" and "favorite score" are combined into one field.

## 2. Folder structure

```
PlanFoodInWeek/
├─ prisma/
│  ├─ schema.prisma
│  └─ seed.ts                 # admin + ~18 sample dishes
├─ src/
│  ├─ middleware.ts           # protects every route except /login, verifies JWT (edge-safe)
│  ├─ app/
│  │  ├─ layout.tsx           # font, Toaster, metadata, viewport
│  │  ├─ globals.css
│  │  ├─ login/page.tsx
│  │  └─ (app)/               # route group requiring login
│  │     ├─ layout.tsx        # app shell + BottomNav
│  │     ├─ page.tsx          # Tab 1: Today
│  │     ├─ week/page.tsx     # Tab 2: Weekly calendar
│  │     ├─ foods/page.tsx    # Tab 3: Foods
│  │     ├─ shopping/page.tsx # Tab 4: Shopping
│  │     └─ settings/page.tsx # Tab 5: Settings
│  ├─ components/
│  │  ├─ ui/                  # shadcn
│  │  ├─ bottom-nav.tsx
│  │  ├─ meal-calendar/       # WeekView, DayCard, MealCard
│  │  ├─ food-management/     # FoodList, FoodFormSheet, FavoriteStars
│  │  ├─ random-picker/       # SwapSheet (Gợi ý / Random lại / Chọn từ danh sách)
│  │  └─ shopping-list/
│  ├─ actions/                # server actions: auth.ts, foods.ts, plans.ts
│  └─ lib/
│     ├─ prisma.ts            # PrismaClient singleton
│     ├─ session.ts           # sign/verify/refresh JWT cookie
│     ├─ random-engine.ts     # scoring + dish selection
│     ├─ week.ts              # getWeekStart, VN dates, weekday/date formatting
│     └─ validations.ts       # zod schemas
├─ docs/                      # spec.md + DESIGN.md (this file)
└─ .env                       # provided by you (see §9)
```

## 3. Database — Prisma schema

```prisma
enum FoodType   { MAIN  SIDE }    // shared by Food.type and MealItem.position
enum MealPeriod { LUNCH DINNER }

model User {
  id           String     @id @default(cuid())
  email        String     @unique
  name         String
  passwordHash String
  createdAt    DateTime   @default(now())
  mealPlans    MealPlan[]
}

model Food {
  id            String         @id @default(cuid())
  name          String
  type          FoodType
  cookingMethod String                        // "Kho" | "Chiên" | "Xào" | ... (string, not enum — allows free-form additions)
  note          String?
  favoriteScore Int            @default(0)    // 0..5 stars
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  ingredients   Ingredient[]
  mealItems     MealItem[]
  statistic     FoodStatistic?
}

model Ingredient {
  id     String @id @default(cuid())
  foodId String
  name   String
  food   Food   @relation(fields: [foodId], references: [id], onDelete: Cascade)
}

model MealPlan {
  id        String   @id @default(cuid())
  userId    String
  weekStart DateTime @db.Date              // always Monday
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
  meals     Meal[]
  @@unique([userId, weekStart])
}

model Meal {
  id         String     @id @default(cuid())
  mealPlanId String
  date       DateTime   @db.Date
  period     MealPeriod
  cookedAt   DateTime?                     // != null means "Đã nấu"
  mealPlan   MealPlan   @relation(fields: [mealPlanId], references: [id], onDelete: Cascade)
  items      MealItem[]
  @@unique([mealPlanId, date, period])
}

model MealItem {
  id       String   @id @default(cuid())
  mealId   String
  foodId   String
  position FoodType                        // MAIN | SIDE
  meal     Meal     @relation(fields: [mealId], references: [id], onDelete: Cascade)
  food     Food     @relation(fields: [foodId], references: [id], onDelete: Cascade)
  @@unique([mealId, position])             // exactly 1 main dish + 1 side dish per meal
}

model FoodStatistic {
  id           String    @id @default(cuid())
  foodId       String    @unique
  totalCooked  Int       @default(0)
  lastCookedAt DateTime?
  food         Food      @relation(fields: [foodId], references: [id], onDelete: Cascade)
}
```

Notes:

- Deleting a `Food` → cascades and removes it from the schedule (`MealItem`). The UI must confirm: _"Món đang nằm trong lịch tuần, xóa sẽ gỡ khỏi lịch"_.
- `date` uses `@db.Date` (no time) — all “today/this week” calculations use the `Asia/Ho_Chi_Minh` time zone on the server (the serverless runtime runs in UTC; do not use a bare `new Date()`).
- Suggested cooking methods in the UI: Kho, Chiên, Xào, Nướng, Luộc, Hấp, Canh, Trộn, Khác.

## 4. Auth & login session

- `/login`: email + password form. Successful login → set the `pf_session` cookie (JWT HS256 signed with `AUTH_SECRET`, `httpOnly`, `sameSite=lax`, `secure` in production, **maxAge 90 days** — this is the “remember login” behavior).
- `middleware.ts` (matcher excludes `_next`, static assets, and `/login`): verify the JWT with `jose` (edge-compatible). Invalid token → redirect to `/login`. An authenticated user visiting `/login` → redirect to `/`. When the token is more than 30 days old → sign it again automatically (sliding renewal; login almost never expires while the app is still being used).
- Failed login: wait ~500ms + show the generic error "Email hoặc mật khẩu không đúng" (enough password-enumeration protection for a one-person app).
- `prisma/seed.ts`: `upsert` the admin `thucdon@gmail.com`, named "Admin", with `passwordHash = bcrypt("admin123123!")`. Rerunning the seed does not create duplicates.
- No registration / password reset / access control — the entire app defaults to admin access after passing middleware.

## 5. Smart meal-plan randomization (`lib/random-engine.ts`)

The score for each candidate dish (using the spec §5 formula, normalized to 0–1):

```
score = 2.0 × (favoriteScore / 5)                        // favorite
      + 1.5 × log(1 + totalCooked) / log(1 + maxCooked)  // frequency (log keeps a dish cooked 30 times from dominating absolutely)
      + 1.5 × min(daysSinceLastCooked, 30) / 30          // time since last cooked (never cooked = 1.0)
      + 1.0 × random()                                   // random factor
```

Selection rules:

1. Main dishes come from the `MAIN` pool; side dishes come from the `SIDE` pool.
2. **No repeats within the week**: exclude every dish already present in the week under consideration.
3. Do not always choose the hard maximum score — use **weighted random selection among the top 5 scores** so each randomization produces a different result while remaining “smart”.
4. When the pool is exhausted (for example, fewer than 14 main dishes when randomizing a full week): relax the constraint — allow repeats at least 2 days apart and prioritize the least-repeated dishes.
5. Limit appearances per week: default 1 (hard-coded in the first phase; move to Settings in a later phase).

Input data: `Food` + `FoodStatistic` + the list of dishes already used in the week. The function is pure and does not call the DB → it can be unit-tested.

## 6. Screens (6 screens: login + 5 bottom-nav tabs)

| Screen                                  | Main content                                                                                                                                                                                                   | Actions                                                                                                                                                                  |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Đăng nhập** (Login) `/login`          | Logo + email/password form                                                                                                                                                                                     | **"Đăng nhập"** (remember for 90 days)                                                                                                                                   |
| **Hôm nay** (Today) `/`                 | 2 **Trưa / Tối** cards for the current day: main dish + side dish + ingredients to prepare                                                                                                                     | Large **"Đã nấu"** button (changes status, updates statistics, with undo), **"Đổi món"** opens `SwapSheet`; if there is no weekly plan → CTA **"Tạo thực đơn tuần này"** |
| **Lịch tuần** (Weekly calendar) `/week` | Switch weeks ‹ ›; 7 day cards (T2→CN), 2 meals per day, 2 dishes per meal; ✓ badge for cooked meals                                                                                                            | **"Random tuần"** (confirm before overwriting), **"Copy tuần trước"** (spec §8), tap a dish → `SwapSheet`                                                                |
| **Món ăn** (Foods) `/foods`             | Search + filter chips (`Tất cả / Món chính / Món phụ`), dish list: name, cooking method, favorite stars, number of times cooked                                                                                | **+** button to add a dish; tap to edit/delete. Form (bottom sheet): name, type, cooking method, ingredients (entered as tags), notes, 0–5-star rating                   |
| **Đi chợ** (Shopping) `/shopping`       | View by **day** (default "Hôm nay" — shopping for the entire week at once is overwhelming) or the full week, using the chip row Cả tuần/T2→CN; merge duplicate names and show which dishes use each ingredient | Checkbox to mark purchased (stored in `localStorage` by week, shared across viewing modes — spec §9 explicitly says inventory is not managed)                            |
| **Cài đặt** (Settings) `/settings`      | Account information, version                                                                                                                                                                                   | **"Đăng xuất"**; (later phase: repeat-dish limit per week, change password)                                                                                              |

**SwapSheet** (bottom sheet for swapping a dish — spec §7): 3 choices — _Gợi ý phù hợp_ (best matches, top 5 by score §5), _Random lại_ (randomize again), and _Chọn từ danh sách_ (choose from the list; search the entire pool of the correct type).

UX principles (spec §12): one-handed operation, large buttons (min-height 44px), bottom sheet instead of a modal, no dashboard.

## 7. Server Actions (`src/actions/`)

| Action                      | Input                                               | Behavior                                                                               |
| --------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `login`                     | email, password                                     | Verify bcrypt → set a 90-day cookie → redirect `/`                                     |
| `logout`                    | —                                                   | Delete the cookie → `/login`                                                           |
| `createFood` / `updateFood` | zod `FoodInput` (including `ingredients[]`)         | Write Food + replace the Ingredient list (transaction)                                 |
| `deleteFood`                | id                                                  | Delete (cascade from the schedule); the UI confirms first                              |
| `setFavorite`               | id, score 0–5                                       | Update the rating                                                                      |
| `generateWeek`              | weekStart                                           | Create/overwrite 7 days × 2 meals × (main + side) using the random engine              |
| `copyLastWeek`              | weekStart                                           | Copy meal items from the previous week and reset `cookedAt`                            |
| `swapItem`                  | mealItemId, `{mode: "random" \| "manual", foodId?}` | Replace 1 dish (randomly exclude the current dish from the week)                       |
| `markCooked` / `undoCooked` | mealId                                              | Transaction: set/clear `cookedAt`, increment/decrement `FoodStatistic` for both dishes |

Read data (week, dish list, suggestions, shopping list) directly through RSC + Prisma; no action is needed. After every mutation, call `revalidatePath`.

## 8. Implementation order

| Phase                           | Work                                                                                                                                                                 | Acceptance                                                                                                                             |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **0. Foundation**               | Scaffold Next 15 + TS + Tailwind v4 + shadcn; Prisma schema + migration; seed admin + 18 sample dishes; auth (login/middleware/logout); app shell + 5-tab bottom nav | Login succeeds with `thucdon@gmail.com`; F5/closing the browser still preserves the session; every route is blocked when not logged in |
| **1. Foods**                    | Dish CRUD + ingredients + favorite stars + search/filter                                                                                                             | Add, edit, and delete dishes smoothly on a mobile viewport                                                                             |
| **2. Weekly calendar + Random** | `random-engine` (with unit tests), Random week, `SwapSheet` swapping, Cooked/undo                                                                                    | Randomizing a full week has no repeats; **"Đã nấu"** increases `totalCooked` and affects the next randomization                        |
| **3. Today + utilities**        | Today tab, Copy previous week, Shopping (aggregate ingredients + checkboxes)                                                                                         | Opening the app immediately shows what to eat today and what to buy                                                                    |
| **4. Polish**                   | Empty/loading states, confirmation dialogs, PWA manifest + icon (add to home screen), full-flow Playwright smoke test                                                | Complete flow: login → add dish → randomize week → swap dish → mark cooked → shop → log out                                            |

Out of scope for this release (spec §13 Phase 2–3): notifications, family preferences, and AI assistant.

Each phase ends with a run on the dev server (mobile viewport 390×844) before moving to the next phase.

## 9. Environment variables to provide

```env
# .env
DATABASE_URL="postgresql://user:password@host:5432/planfood"  # required
AUTH_SECRET="random string >= 32 characters"                     # I can generate this myself if you want
```

- **Neon / local Postgres**: only `DATABASE_URL` is needed.
- **Supabase**: add `DIRECT_URL` (port 5432) for migrations; point `DATABASE_URL` to the 6543 pooler — the schema will declare an additional `directUrl`.
- Run locally first; deploy (Vercel + Neon/Supabase) after the app is stable.

## 10. Implementation status — 30/08/2026: COMPLETE ✅

All of Phases 0–4 have been built, tested, and verified in a browser (viewport 390×844). Differences from the plan due to “using the latest version”:

| Plan                     | Actual                                                                                                                      | Notes                                                                                                                                                                                                                |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next.js 15               | **Next.js 16.3.3**                                                                                                          | `middleware.ts` was renamed to `src/proxy.ts` (exports `proxy`); `searchParams` is a Promise                                                                                                                         |
| Prisma (v6)              | **Prisma 7.10**                                                                                                             | The URL is in `prisma.config.ts` (the CLI uses `DIRECT_URL`); the `prisma-client` generator outputs to `src/generated/prisma`; runtime requires the `@prisma/adapter-pg` driver adapter; seeding runs with `npx tsx` |
| shadcn init `-b neutral` | shadcn v5: `init -y -b radix -p mira`                                                                                       | Flags changed meaning; the theme was rewritten in `globals.css` (vegetable-green palette + dark mode via `prefers-color-scheme`)                                                                                     |
| —                        | Transaction combines 4 queries (`createManyAndReturn`)                                                                      | 14 sequential `create` calls exceeded the 5s timeout with remote Supabase                                                                                                                                            |
| —                        | Engine: when the pool has < 14 slots, relaxes constraints but forbids same-day repeats and distributes repeat counts evenly | Caught during UI verification and covered by a unit test                                                                                                                                                             |

Verification completed: 20 unit tests passed · `tsc --noEmit` clean · `eslint` clean · `next build` production succeeded · the login → random week → swap dish (3 modes) → cook/undo → add dish → shopping → logout flow worked on real Supabase.

Not done (deferred): PNG icon for the PWA install prompt on some devices (currently using SVG), change password, weekly repeat-dish limit in Settings, notifications + AI assistant (spec Phases 2–3).

### Addendum 30/08/2026 (afternoon) — responsive desktop/tablet + feedback adjustments

- **Full responsiveness**: `lg+` uses a left sidebar (`side-nav.tsx`) instead of the bottom nav; Today uses 2 columns (`md`), the Weekly calendar uses a 2-column day grid (`md`) → 7 columns (`2xl`), and Foods/Shopping use 2–3-column card grids; the bottom sheet automatically becomes a centered dialog on desktop via `responsive-sheet.tsx` + the `use-is-desktop.ts` hook (`useSyncExternalStore`, matching the `lg` breakpoint).
- **Shopping by day** (user request): default to "Today", with chips for T2→CN/Full week; ingredient aggregation was moved into the pure client-side `lib/shopping.ts` function, while checkmarks remain stored by week and are shared between viewing modes.
- **Món chính/Món phụ labels** (user request): each dish in `MealCard` has a small uppercase label (main = primary color, side = muted) in both variants; the side dish drops the "+" prefix and adds a cooking-method badge in the full variant.

### Addendum 30/08/2026 (evening) — Excel import, quick delete, dark mode

- **Import dishes from Excel** (user request): an "Nhập Excel" button is available in the Foods tab. A template `.xlsx` file downloads from `/foods/template` (generated dynamically with `exceljs`: 6 columns, Chính/Phụ dropdown, Hướng dẫn sheet, 2 example rows). The 2-step flow is: `parseImportExcel` (server action, read the file → preview each row: hợp lệ / trùng-bỏ-qua / lỗi with the row number) → the user confirms → `importFoods` (validate again with zod, skip duplicates by name+type, write 3 batched `createManyAndReturn` queries in a transaction). Maximum 200 dishes per import; accepts "Chính/chinh/MAIN/Món chính"… (normalizes by removing diacritics in `lib/import-foods.ts` — with unit tests). `serverActions.bodySizeLimit` was raised to 4MB.
- **Quick delete in the dish list** (user request): a trash icon on each card (does not require opening the form), always behind an AlertDialog confirmation; the row was changed to a div + 2 buttons to avoid nested buttons.
- **Light/Dark mode** (user request): `next-themes` manages the `.dark` class (removes the hard-coded media query from `globals.css`); a Sáng/Tối/Hệ thống selector is available in Settings (`theme-toggle.tsx`, mounted guard using `useSyncExternalStore`); the default follows the operating system, and the choice is stored in localStorage.
- Gotchas encountered: shadcn v5's `AlertDialogAction` accepts a `variant` prop (overriding `className` does not work because Slot does not tw-merge); `exceljs` is CJS (named imports work only through the bundler); the dev-console error "Router action dispatched before initialization" is Next dev HMR noise, not an app bug.

### Addendum 30/08/2026 (night) — multiple members + marking who eats/does not eat

**Major constraint change requested by the user**: the app changed from 1 admin to **5 family accounts** (`thucdon`/`nam`/`khang`/`dat`/`bao` @gmail.com, all using password `admin123123!`, idempotent seed in `FAMILY_ACCOUNTS`).

- **The meal plan is shared by the whole family**: `meal_plans` changed its unique key from `(userId, weekStart)` to `(weekStart)` — `userId` remains only as the creator; `getWeekPlan(weekStartISO)` no longer filters by user. Dishes/statistics were already shared data.
- **Per-meal attendance marking** (lunch/dinner — meal-level rather than day-level because “not eating tonight” is the common case): new `meal_absences` table (unique mealId+userId; a row means **not eating**, everyone eats by default, cascade when a meal/user is deleted). `toggleMealAbsence` action — every member can mark attendance for the others (the family trusts one another; a parent can mark for a child).
- **UI**: the Today meal card has an "Ai ăn bữa này · x/5" section with a chip for each person — tap to toggle, update immediately with `useOptimistic`; a non-eating chip is struck through + shows the `UserX` icon. The Weekly calendar shows “Nam, Đạt không ăn” when someone is absent; Settings lists all 5 members and marks the logged-in user with “(bạn)”.
- **Migration without a TTY**: Prisma 7 `migrate dev` refuses a non-interactive shell → use `migrate diff --from-config-datasource --to-schema --script -o` to write SQL into `prisma/migrations/<ts>_multi_user_attendance/`, then run `migrate deploy`.
- Gotcha: the Prisma singleton cache in `globalThis` survives HMR — after `prisma generate` changes the schema, restart the dev server; the new client cannot be hot-reloaded.

### Addendum 30/08/2026 (late night) — member management, renaming to "PlanFoodInWeek", household shopping habits

- **Delete accounts in the app** (answering "remove admin account"): the **"Cài đặt → Thành viên gia đình"** screen has a delete button for each person, with a confirmation that clearly states the consequences; deleting the last account is blocked; **deleting yourself logs you out immediately** (the `deleteMember` action). To make this clean: remove the `meal_plans.userId` column entirely (migration `household_plan_no_owner`) — the meal plan is not tied to its creator, so deleting a user does not affect the schedule. **The user has deleted `thucdon@gmail.com`**; the seed also removes this account from `FAMILY_ACCOUNTS` so it is not resurrected (the system now has 4 members: Nam, Khang, Đạt, Bảo). Note that stateless JWT means a session already logged in on another device for the deleted account remains valid until it expires or is logged out (the account cannot be used to log in again).
- **Rename the app to "PlanFoodInWeek"** (user request; I chose the name): every displayed occurrence comes from `src/lib/app-info.ts` (APP_NAME/TAGLINE/DESCRIPTION/VERSION 0.2.0) — metadata, login, sidebar, manifest, Settings footer, and the Excel template file (`mau-mon-an-com-nha.xlsx`). Technical names (package/folder/artifact) remain PlanFoodInWeek.
- **Side dish is optional per meal** (user request): weekly randomization still initially selects a main + side dish, but an individual meal may remove its side dish (a side-dish swap sheet has a "Bữa này không ăn món phụ" button — `removeSideDish` action; only SIDE can be removed, the main dish is required), and it can be added again through the dashed "+ Thêm món phụ" button on the card (add mode: random thông minh / gợi ý / chọn tay — `addSideDish`, `suggestSideForMeal`; the suggestion helper shares `topSuggestionDTOs`). Engine: `WeekAssignment.sideId` is nullable — even when the side-dish pool is empty, the week can still be randomized with main dishes only (33 unit tests).
- **Shopping according to household habits** (user request): the new **"Tối nay + trưa mai"** scope is the default when viewing the current week — matching the habit of shopping in the afternoon; on Sunday, “tomorrow's lunch” falls in the next week, so the page loads the next week's plan and merges across weeks, with a note when the next week has no meal plan. The list is now structured **Buổi → Món → Nguyên liệu** (no more confusing flat list); on desktop, each meal has 2 adjacent dish cards. The Copy button outputs that same structure (▸ Tối nay (30/08) / - Cá kho tộ: Cá basa, …). Checkmarks still use ingredient names — buying an ingredient once crosses it out everywhere.

### Addendum 31/08/2026 — rating sort + per-meal notes

- **Sorting in the Foods tab** (user request): a select "Tên A→Z / Rating cao nhất" sits beside the filter-chip row (`foods-screen.tsx`, shadcn Select). Rating sort: `favoriteScore` descending, ties by name (the `vi` collation); client-side and combinable with search + type filtering.
- **Per-meal notes** (user request — "what if that meal is missing seasoning ingredients"): new `meals.note` column (String?, migration `20260831040000_meal_note`), `setMealNote(mealId, note)` action — trim, empty = delete, limit 300 characters (an internal constant because a `"use server"` file cannot export const). The UI in `MealCard`, both variants: **"Thêm ghi chú"** → inline textarea + **Lưu/Hủy/Xóa ghi chú**; when a note exists, show an amber box with the StickyNote icon, and click it to edit. The Shopping tab shows the note below the meal heading (same amber box), and Copy includes the `⚠ Ghi chú: …` line immediately below `▸ Tối nay (31/08)` (the user emphasized this requirement); a meal with a note still appears in the shopping list even when its dishes have no ingredients to buy.
- Verification 31/08: tsc/eslint clean, 33 unit tests passed, `next build` OK; browser: sorting changes the order correctly (★5 → ★4 → ★3), add/edit/delete notes on Today + Weekly calendar, notes appear in Shopping and in the clipboard on Copy (using the `navigator.clipboard.writeText` hook to read), 0 console errors.

## 11. Sample dish seed data (can be deleted in the app)

- **Main dishes (10)**: Thịt kho trứng, Cá kho tộ, Gà kho gừng, Tôm rim mặn, Gà chiên nước mắm, Cá chiên giòn, Trứng chiên hành, Sườn xào chua ngọt, Bò lúc lắc, Ba rọi luộc.
- **Side dishes (8)**: Canh chua cá, Canh bí đỏ thịt bằm, Canh rau ngót, Canh khổ qua nhồi thịt, Rau muống xào tỏi, Cải thìa xào nấm, Đậu que xào, Rau lang luộc.

Each dish includes basic ingredients, and several dishes are preset to 4–5 stars so that smart randomization shows a difference immediately.
