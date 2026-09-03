import { prisma } from "@/lib/prisma";
import { dateToISO, isoToDate } from "@/lib/week";

/** One household's weekly plan (unique by week), including foods, ingredients, and absences. */
export async function getWeekPlan(weekStartISO: string) {
  return prisma.mealPlan.findUnique({
    where: { weekStart: isoToDate(weekStartISO) },
    include: {
      meals: {
        orderBy: [{ date: "asc" }, { period: "asc" }],
        include: {
          items: {
            orderBy: { position: "asc" }, // MAIN before SIDE
            include: { food: { include: { ingredients: true } } },
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

/** All foods and their statistics, sorted by name. */
export async function getAllFoods() {
  return prisma.food.findMany({
    orderBy: [{ name: "asc" }],
    include: { ingredients: true, statistic: true },
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
