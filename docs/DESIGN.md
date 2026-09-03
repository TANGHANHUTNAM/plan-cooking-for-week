# Visual design standard — Cơm Nhà

> This document is the implementation-facing visual standard. Feature requirements live in [spec.md](./spec.md); current technical structure and invariants live in [architecture.md](./architecture.md).

## Product character

Cơm Nhà is a Vietnamese, mobile-first family meal-planning app for the daily question “hôm nay ăn gì?”. The primary audience is a household member checking today’s meals, marking who is eating, swapping a dish, or preparing a shopping list with one hand. The interface should feel calm, practical, and familiar rather than like a reporting dashboard.

**Art direction:** a crisp cool-neutral canvas, near-black blue-charcoal text, deep evergreen actions, lower-saturation teal for lunch, and slate-blue for dinner. Let the meal and its next action carry the hierarchy; use food-related line icons and type labels instead of decorative imagery.

**Anti-default constraints:**

- Do not turn the app into a marketing hero, dashboard, or set of equal feature cards. Pages open with a useful title and task content.
- Do not add unmotivated gradients, illustrations, photos, or ornamental animation. The login page’s low-opacity primary radial halo and the bottom navigation’s translucent chrome are narrow existing exceptions, not a general surface treatment; retain only purposeful interaction transitions.
- Do not cover the UI in glass, shadows, or nested cards. Use a card for a meaningful group, a muted compact meal panel for a weekly slot, and borders/rings for separation or emphasis.
- Do not use color as the only status signal. Pair cooked, absent, selected, error, and empty states with text, icons, or shape changes.

## Composition and density

- **Today first:** show the date, a short purpose statement, weekly cooking progress, then the lunch and dinner cards. Keep the primary actions close to the relevant meal.
- **Weekly scan:** each day card has a weekday/date header and two stable rows (lunch, dinner). Preserve the row heights when a meal or side dish is missing so the calendar remains scannable.
- **Foods:** group dishes by “Món chính” and “Món phụ”; keep search, sort, and filter controls together. Cards expose name, cooking method, rating, and cooked count without requiring a detail view.
- **Shopping:** organize by meal, then dish, then ingredients. Keep the scope chips and progress near the top; shared ingredients can be checked once and shown as completed everywhere.
- Prefer short Vietnamese labels and one clear action per region. Empty states always explain the next step.

## Tokens and type

Use the existing tokens in `src/app/globals.css`; do not introduce a parallel palette.

| Role                                                 | Light value                                                                                                               | Dark value                                                                                                                    | Use                                 |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `--background`                                       | `oklch(0.985 0.004 250)`                                                                                                  | `oklch(0.17 0.015 250)`                                                                                                       | App canvas                          |
| `--foreground`                                       | `oklch(0.22 0.018 250)`                                                                                                   | `oklch(0.94 0.006 250)`                                                                                                       | Main text                           |
| `--card` / `--card-foreground`                       | `oklch(1 0 0)` / `oklch(0.22 0.018 250)`                                                                                  | `oklch(0.215 0.016 250)` / `oklch(0.94 0.006 250)`                                                                            | Grouped surfaces and text           |
| `--popover` / `--popover-foreground`                 | `oklch(1 0 0)` / `oklch(0.22 0.018 250)`                                                                                  | `oklch(0.235 0.018 250)` / `oklch(0.94 0.006 250)`                                                                            | Floating surfaces and text          |
| `--primary` / `--primary-foreground`                 | `oklch(0.43 0.09 155)` / `oklch(0.985 0.003 190)`                                                                         | `oklch(0.68 0.105 155)` / `oklch(0.19 0.035 155)`                                                                             | Main actions and today              |
| `--secondary` / `--secondary-foreground`             | `oklch(0.93 0.025 155)` / `oklch(0.34 0.06 155)`                                                                          | `oklch(0.275 0.04 155)` / `oklch(0.83 0.06 155)`                                                                              | Selected and soft green state       |
| `--muted` / `--muted-foreground`                     | `oklch(0.96 0.004 250)` / `oklch(0.48 0.02 250)`                                                                          | `oklch(0.245 0.012 250)` / `oklch(0.7 0.008 250)`                                                                             | Quiet surfaces and supporting text  |
| `--accent` / `--accent-foreground`                   | `oklch(0.93 0.025 155)` / `oklch(0.34 0.06 155)`                                                                          | `oklch(0.275 0.04 155)` / `oklch(0.83 0.06 155)`                                                                              | Hover and selected accents          |
| `--warm` / `--warm-foreground` / `--warm-surface`    | `oklch(0.62 0.1 190)` / `oklch(0.36 0.06 195)` / `oklch(0.94 0.025 190)`                                                  | `oklch(0.72 0.09 190)` / `oklch(0.84 0.06 190)` / `oklch(0.3 0.04 190)`                                                       | Lunch, stars, and notes (teal/cyan) |
| `--cool` / `--cool-foreground` / `--cool-surface`    | `oklch(0.53 0.08 255)` / `oklch(0.36 0.07 255)` / `oklch(0.94 0.018 255)`                                                 | `oklch(0.72 0.085 255)` / `oklch(0.85 0.06 255)` / `oklch(0.3 0.04 255)`                                                      | Dinner (slate/blue)                 |
| `--destructive`                                      | `oklch(0.575 0.21 27)`                                                                                                    | `oklch(0.7 0.19 25)`                                                                                                          | Irreversible actions and errors     |
| `--border` / `--input`                               | `oklch(0.91 0.006 250)` / `oklch(0.9 0.008 250)`                                                                          | `oklch(1 0 0 / 12%)` / `oklch(1 0 0 / 15%)`                                                                                   | Separation and controls             |
| `--ring`                                             | `oklch(0.43 0.09 155)`                                                                                                    | `oklch(0.68 0.105 155)`                                                                                                       | Focus indication                    |
| `--sidebar` / `--sidebar-foreground`                 | `oklch(0.965 0.006 250)` / `oklch(0.22 0.018 250)`                                                                        | `oklch(0.14 0.014 250)` / `oklch(0.94 0.006 250)`                                                                             | Navigation chrome                   |
| `--sidebar-primary` / `--sidebar-primary-foreground` | `oklch(0.43 0.09 155)` / `oklch(0.985 0.003 190)`                                                                         | `oklch(0.68 0.105 155)` / `oklch(0.19 0.035 155)`                                                                             | Navigation actions                  |
| `--sidebar-accent` / `--sidebar-accent-foreground`   | `oklch(0.93 0.025 155)` / `oklch(0.34 0.06 155)`                                                                          | `oklch(0.275 0.04 155)` / `oklch(0.83 0.06 155)`                                                                              | Active navigation state             |
| `--sidebar-border` / `--sidebar-ring`                | `oklch(0.91 0.006 250)` / `oklch(0.43 0.09 155)`                                                                          | `oklch(1 0 0 / 12%)` / `oklch(0.68 0.105 155)`                                                                                | Navigation separation and focus     |
| `--chart-1` through `--chart-5`                      | `oklch(0.43 0.09 155)` · `oklch(0.61 0.07 155)` · `oklch(0.62 0.1 190)` · `oklch(0.53 0.08 255)` · `oklch(0.48 0.02 250)` | `oklch(0.68 0.105 155)` · `oklch(0.58 0.08 155)` · `oklch(0.72 0.09 190)` · `oklch(0.72 0.085 255)` · `oklch(0.94 0.006 250)` | Data visualization                  |

Manrope is loaded as the single variable Google font (`weight: "variable"`) for both body and headings through `--font-sans`. Follow the existing hierarchy: `PageHeader` uses a bold, tight page title (mobile `1.625rem`, desktop `text-3xl`); section headings are 16px semibold; supporting labels and metadata are usually 11–14px. Keep Vietnamese diacritics intact and use tabular numerals for counts and dates.

The base radius is `--radius: 0.75rem`. Use existing semantic radius utilities: rounded cards and compact panels, full pills for period/scope chips, and circular treatment only for avatars, day numbers, or floating add actions. Common page gutters are `px-4`, `sm:px-6`, and `lg:px-10`; common content gaps are the existing 12px/16px rhythm (`gap-3`/`gap-4`). On touch layouts, controls use the existing 44px `h-11`/`min-h-11` target; compact desktop controls may be smaller.

## Components and states

- Use `PageHeader` for page title, concise description, and contextual actions. Use `SectionHeading` for secondary groups.
- Use the shared `Card` components for major content groups. Use `PeriodChip` consistently: teal/cyan with a sun icon for lunch, slate/blue with a moon icon for dinner.
- Use `FoodTypeIcon`/`FoodTypeTile` to distinguish main and side dishes. Keep the main dish visually primary; a side dish may be absent and uses the existing dashed “Thêm món phụ” affordance.
- Use `EmptyState` for no plan, no foods, no search results, and no shopping items. It combines a familiar icon, a plain-language explanation, and the next action.
- Use `ResponsiveSheet` for swap and food forms: a bottom drawer on mobile/tablet and a centered dialog on desktop. Do not replace this workflow with a new modal pattern.
- Show cooked state with a check icon and text, and provide undo. Show pending mutations with the shared spinner and prevent duplicate submission; use the existing toast pattern for success/errors.
- Attendance chips are selected when a member eats and struck through/dashed when absent. Notes use the warm surface and `StickyNote`; checked shopping items use muted text and a line-through.
- Interactive cards must not create nested buttons. Give a card one primary edit target and keep delete/swap controls as separate, labelled controls.

## Responsive behavior

- Below `lg` (1024px), use the five-item bottom navigation with safe-area padding; at `lg` and above, replace it with the left `SideNav`. Preserve `aria-current` on the active route in either navigation.
- The app shell keeps the main content vertically scrollable on small screens and uses the existing responsive page gutters. Keep primary actions reachable without horizontal page scrolling.
- Today stacks lunch/dinner below `md` and uses two columns from `md`. The weekly grid progresses from two columns at `sm`, to three at `lg`, four at `xl`, and seven at the custom `3xl` breakpoint (110rem). Foods uses 2/3/4 columns at `sm`/`lg`/`xl`; shopping uses 2 columns at `sm` and 3 at `xl`.
- Keep long scope/filter chip rows horizontally scrollable on small screens without visible scrollbars. Do not shrink labels until they become ambiguous.
- On desktop, use the wider weekly canvas; keep Today, Foods, Shopping, and Settings readable rather than stretching text across the viewport.
- Sheets stay within the viewport and scroll their content. The current dialog/drawer behavior and focus restoration are the standard for every form-like flow.

## Interaction and accessibility

- Every icon-only control has an accessible name; use tooltips as reinforcement, not as the only label for essential actions. Keep visible focus rings (`focus-visible:ring-2`) and a logical keyboard order.
- Use semantic headings, landmarks, links for navigation, buttons for mutations, labels for form controls, and `aria-current`/`aria-pressed` where state is exposed.
- Keep touch targets at least 44px on mobile. Do not rely on hover for an action or status. Confirm destructive dish/member deletion and explain the consequence.
- Preserve the focus trap and return-focus behavior of `ResponsiveSheet`. Respect the existing `prefers-reduced-motion` rule and do not add motion that competes with meal actions.
- Treat color contrast and dark mode as token responsibilities: use semantic foreground/surface pairs, not hard-coded colors. Error copy should be specific enough to recover without exposing internals.
- Keep copy Vietnamese, concrete, and truthful to the current action (for example, distinguish “Đã nấu”, “Bỏ đánh dấu”, and “Thêm món phụ”).

## Verification checklist

Before accepting a visual change, check:

- [ ] The surface still feels like a calm household utility, not a generic dashboard or marketing page.
- [ ] Typography, diacritics, palette roles, radius, density, and card restraint use the existing tokens/components.
- [ ] Lunch/dinner and main/side distinctions remain visible without color alone.
- [ ] Empty, loading, error, cooked, absent, checked, pending, and destructive states have clear feedback and recovery where appropriate.
- [ ] Mobile 390×844 remains one-hand usable; desktop `lg+` uses the sidebar and the appropriate wider layout.
- [ ] Keyboard focus, labels, target sizes, reduced motion, and dark mode remain usable.
- [ ] The change is checked in a real browser when visual evidence is required; this document does not replace browser QA.

## Evidence and open questions

This standard is grounded in `src/app/globals.css`, `src/app/layout.tsx`, the app shell, navigation, page header, meal/day cards, foods and shopping screens, `responsive-sheet.tsx`, and `src/lib/app-info.ts`. Exact values above are source-backed; composition rules are normalized from the current route/component structure.

The displayed name currently comes from `APP_NAME` in `src/lib/app-info.ts` (`Cơm Nhà`), while the repository/package is named PlanFoodInWeek. Keep display identity centralized there until the product name is explicitly settled.
