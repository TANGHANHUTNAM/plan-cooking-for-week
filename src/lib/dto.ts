// DTO tuần tự hóa được để truyền từ Server Component sang Client Component
// (Date -> chuỗi ISO, gọt bớt field thừa).

import type { FoodWithMeta, Member, WeekMeal } from "@/lib/queries";
import { dateToISO } from "@/lib/week";

export interface MemberDTO {
  id: string;
  name: string;
}

export function mapMember(member: Member): MemberDTO {
  return { id: member.id, name: member.name };
}

export interface FoodDTO {
  id: string;
  name: string;
  type: "MAIN" | "SIDE";
  cookingMethod: string;
  note: string | null;
  favoriteScore: number;
  ingredients: string[];
  totalCooked: number;
}

export interface MealItemDTO {
  id: string;
  position: "MAIN" | "SIDE";
  food: FoodDTO;
}

export interface MealDTO {
  id: string;
  dateISO: string;
  period: "LUNCH" | "DINNER";
  cookedAt: string | null;
  /** ghi chú cho bữa (vd: thiếu nước mắm) — hiện cả ở tab Đi chợ */
  note: string | null;
  items: MealItemDTO[];
  /** id thành viên KHÔNG ăn bữa này (mặc định ai cũng ăn) */
  absentUserIds: string[];
}

export function mapFood(food: FoodWithMeta): FoodDTO {
  return {
    id: food.id,
    name: food.name,
    type: food.type,
    cookingMethod: food.cookingMethod,
    note: food.note,
    favoriteScore: food.favoriteScore,
    ingredients: food.ingredients.map((i) => i.name),
    totalCooked: food.statistic?.totalCooked ?? 0,
  };
}

export function mapMeal(meal: WeekMeal): MealDTO {
  return {
    id: meal.id,
    dateISO: dateToISO(meal.date),
    period: meal.period,
    cookedAt: meal.cookedAt ? meal.cookedAt.toISOString() : null,
    note: meal.note,
    absentUserIds: meal.absences.map((a) => a.userId),
    items: meal.items.map((item) => ({
      id: item.id,
      position: item.position,
      food: {
        id: item.food.id,
        name: item.food.name,
        type: item.food.type,
        cookingMethod: item.food.cookingMethod,
        note: item.food.note,
        favoriteScore: item.food.favoriteScore,
        ingredients: item.food.ingredients.map((i) => i.name),
        totalCooked: 0, // không dùng trong lịch
      },
    })),
  };
}
