// Serializable week DTO for passing from a Server Component to a Client Component
// (Date -> ISO string, trimming unused fields).

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

export interface SwapFoodDTO {
  id: string;
  name: string;
  type: "MAIN" | "SIDE";
  cookingMethod: string;
  favoriteScore: number;
  totalCooked: number;
}

export interface MealFoodDTO {
  id: string;
  name: string;
  cookingMethod: string;
  ingredients: string[];
}

export interface MealItemDTO {
  id: string;
  position: "MAIN" | "SIDE";
  food: MealFoodDTO;
}

export interface SwapItemDTO {
  id: string;
  food: Pick<MealFoodDTO, "id" | "name">;
}

export interface MealDTO {
  id: string;
  dateISO: string;
  period: "LUNCH" | "DINNER";
  cookedAt: string | null;
  /** Meal note (e.g. missing fish sauce), also shown on the Shopping tab. */
  note: string | null;
  items: MealItemDTO[];
  /** IDs of members who do NOT eat this meal (everyone eats by default). */
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
        cookingMethod: item.food.cookingMethod,
        ingredients: item.food.ingredients.map((i) => i.name),
      },
    })),
  };
}
