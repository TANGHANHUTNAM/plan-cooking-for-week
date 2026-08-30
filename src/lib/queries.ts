import { prisma } from "@/lib/prisma";
import { isoToDate } from "@/lib/week";

/** Thực đơn 1 tuần của CẢ NHÀ (unique theo tuần) kèm món + nguyên liệu + ai không ăn. */
export async function getWeekPlan(weekStartISO: string) {
  return prisma.mealPlan.findUnique({
    where: { weekStart: isoToDate(weekStartISO) },
    include: {
      meals: {
        orderBy: [{ date: "asc" }, { period: "asc" }],
        include: {
          items: {
            orderBy: { position: "asc" }, // MAIN trước SIDE
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

/** Toàn bộ món + thống kê, sắp theo tên. */
export async function getAllFoods() {
  return prisma.food.findMany({
    orderBy: [{ name: "asc" }],
    include: { ingredients: true, statistic: true },
  });
}

export type FoodWithMeta = Awaited<ReturnType<typeof getAllFoods>>[number];

/** Các thành viên gia đình (theo thứ tự tạo tài khoản). */
export async function getMembers() {
  return prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true },
  });
}

export type Member = Awaited<ReturnType<typeof getMembers>>[number];
