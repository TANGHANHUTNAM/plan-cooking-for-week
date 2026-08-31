# Smart Weekly Meal Planner - Product Specification

## 1. Overview

## Product goals

Smart Weekly Meal Planner is an application for managing a family's weekly meal plan.

Goals:

- Help users plan dishes from Monday through Sunday.
- Each day has 2 meals: lunch and dinner.
- Each meal includes:
  - 1 main dish (savory, braised, fried, stir-fried, grilled...)
  - 1 side dish (soup, vegetables, stir-fried dish...)
- Randomize the meal plan from the list of dishes created by the user.
- Learn eating habits to prioritize dishes that are used frequently.

The application focuses on: \> "Open the app quickly, know what's for today, and what needs to be prepared."

It does not manage recipes or cooking-instruction videos.

---

# 2. MVP Scope

## Main features

### 1. Food management

Users can:

- Add a dish.
- Edit a dish.
- Delete a dish.
- Mark a dish as a favorite.
- Record the ingredients that need to be prepared.

Dish information:

- Dish name.
- Dish type.
- Cooking method.
- Dish group.
- Ingredient list.
- Notes.

Example:

Thịt kho trứng

Type: - Main dish

Cooking method: - Kho

Ingredients: - Thịt heo - Trứng - Nước dừa

---

# 3. Dish categories

## Main-dish group

MAIN

Examples:

- Kho
- Chiên
- Xào
- Nướng
- Luộc

## Side-dish group

SIDE

Examples:

- Canh
- Rau xào
- Rau luộc

---

# 4. Weekly Meal Planner

## Structure

A week:

Monday → Sunday

Each day:

- Lunch
- Dinner

Each meal:

- Main dish
- Side dish

Example:

Monday:

Lunch: - Cá kho - Canh chua

Dinner: - Gà chiên - Rau xào

---

# 5. Smart meal-plan randomization

## Not pure randomization

The system uses priority scores.

Formula:

Score =

Favorite Score + Frequency Score + Last Cooked Score + Random Weight

## Rules

- Do not repeat the same dish during the week.
- Prioritize dishes the user eats frequently.
- Prioritize dishes that have not appeared for a long time.
- Allow a limit on the number of appearances.

Example:

Thịt kho:

- Eaten 30 times.
- Favorite rating: 5 stars.
- Not eaten for 10 days.

=\> High score.

---

# 6. Dish history management

After completing a meal:

The user taps:

"Đã nấu"

The system updates:

- The number of times the dish has been used.
- The last time it was used.
- Weekly frequency.

This data powers smart randomization.

---

# 7. Quick dish swap

In the weekly calendar:

Users can:

- Randomize the current dish again.
- Choose a dish manually.
- Replace the main dish.
- Replace the side dish.

UX:

Mobile bottom sheet:

"Đổi món":

- Suitable suggestions.
- Randomize again.
- Choose from the list.

---

# 8. Copy previous week

This feature reduces the amount of work.

Flow:

New week:

Copy previous week

Then edit a few dishes.

---

# 9. Shopping Note (Optional)

Inventory is not managed.

Only supports:

Aggregate ingredients from the meal plan.

Example:

This week needs:

- Thịt heo
- Cá
- Rau cải
- Trứng

---

# 10. Database Design

## users

Fields:

- id
- name
- email
- created_at

## foods

Stores dishes.

Fields:

- id
- name
- type
- cooking_method
- note
- favorite_score
- created_at

type:

- MAIN
- SIDE

## ingredients

Ingredients.

Fields:

- id
- food_id
- name

## meal_plans

A weekly plan.

Fields:

- id
- user_id
- week_start
- created_at

## meals

A meal.

Fields:

- id
- meal_plan_id
- date
- period

period:

- LUNCH
- DINNER

## meal_items

Dishes in a meal.

Fields:

- id
- meal_id
- food_id
- position

position:

- MAIN
- SIDE

## food_statistics

Dish statistics.

Fields:

- id
- food_id
- total_cooked
- last_cooked_at
- weekly_count

---

# 11. Frontend Architecture

Tech stack:

- Next.js 15
- TypeScript
- Tailwind CSS
- Shadcn UI
- Prisma
- PostgreSQL

## UI Structure

/app

/components

- meal-calendar
- food-management
- random-picker
- shopping-list

---

# 12. Mobile First UX

## Bottom Navigation

5 tabs:

1.  Hôm nay
2.  Lịch tuần
3.  Món ăn
4.  Đi chợ
5.  Cài đặt

## UX principles

- One-handed operation.
- Minimal data entry.
- Large buttons.
- Bottom sheet instead of a modal.
- Do not create a complex dashboard.

---

# 13. Development roadmap

## Phase 1

MVP:

- Dish CRUD.
- Weekly calendar.
- Dish randomization.
- Dish swapping.
- Favorites.
- Usage history.

## Phase 2

- Shopping note.
- Family preferences.
- Copy week.
- Notifications.

## Phase 3

AI Meal Assistant:

Example:

"Nhà còn thịt gà và rau cải"

AI suggests:

- Gà xào cải xanh.
- Canh gà.

---

# 14. Development principles

Priorities:

- Simplicity.
- Speed.
- Mobile first.
- Minimal interaction.
- The more it is used, the smarter the data becomes.

Do not build:

- Recipes.
- Videos.
- Social networks.
- A marketplace.
