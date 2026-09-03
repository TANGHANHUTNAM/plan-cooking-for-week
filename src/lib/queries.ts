import { prisma } from "@/lib/prisma";
import { dateToISO, isoToDate } from "@/lib/week";

/** One household's weekly plan, selecting only fields used by calendar and shopping views. */
export async function getWeekPlan(weekStartISO: string) {
  return prisma.mealPlan.findUnique({
    where: { weekStart: isoToDate(weekStartISO) },
    select: {
      meals: {
        orderBy: [{ date: "asc" }, { period: "asc" }],
        select: {
          id: true,
          date: true,
          period: true,
          cookedAt: true,
          note: true,
          items: {
            orderBy: { position: "asc" }, // MAIN before SIDE
            select: {
              id: true,
              position: true,
              food: {
                select: {
                  id: true,
                  name: true,
                  cookingMethod: true,
                  ingredients: { select: { name: true } },
                },
              },
            },
          },
          absences: { select: { userId: true } },
        },
      },
    },
  });
}

export type WeekPlan = NonNullable<Awaited<ReturnType<typeof getWeekPlan>>>;
export type WeekMeal = WeekPlan["meals"][number];

/** Shared shopping state: weekly ingredient checks and extra items by date. */
export async function getShoppingState(
  weekStartISO: string,
  extraEndISO: string
) {
  const [ingredientChecks, extras] = await Promise.all([
    prisma.shoppingIngredientCheck.findMany({
      where: { weekStart: isoToDate(weekStartISO) },
      select: { ingredientKey: true },
    }),
    prisma.shoppingExtra.findMany({
      where: {
        date: {
          gte: isoToDate(weekStartISO),
          lte: isoToDate(extraEndISO),
        },
      },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      select: { id: true, date: true, name: true, purchased: true },
    }),
  ]);

  return {
    ingredientKeys: ingredientChecks.map((check) => check.ingredientKey),
    extras: extras.map((extra) => ({
      id: extra.id,
      dateISO: dateToISO(extra.date),
      name: extra.name,
      purchased: extra.purchased,
    })),
  };
}

export type ShoppingState = Awaited<ReturnType<typeof getShoppingState>>;

/** All food fields needed by the Foods page and edit form, sorted by name. */
export async function getAllFoods() {
  return prisma.food.findMany({
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      type: true,
      cookingMethod: true,
      note: true,
      favoriteScore: true,
      ingredients: { select: { name: true } },
      statistic: { select: { totalCooked: true } },
    },
  });
}

export type FoodWithMeta = Awaited<ReturnType<typeof getAllFoods>>[number];

/** Household members, ordered by account creation. */
export async function getMembers() {
  return prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true },
  });
}

export type Member = Awaited<ReturnType<typeof getMembers>>[number];
