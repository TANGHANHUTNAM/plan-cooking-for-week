"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { foodSchema } from "@/lib/validations";

export interface FoodFormState {
  error?: string;
  /** Increment after each successful save so the client can close the form. */
  savedAt?: number;
}

async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("Chưa đăng nhập");
  return session;
}

function parseFoodForm(formData: FormData) {
  return foodSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    cookingMethod: formData.get("cookingMethod"),
    note: formData.get("note") ?? "",
    favoriteScore: formData.get("favoriteScore") ?? 0,
    ingredients: formData
      .getAll("ingredients")
      .map((v) => String(v).trim())
      .filter((v) => v.length > 0),
  });
}

export async function createFood(
  _prev: FoodFormState,
  formData: FormData
): Promise<FoodFormState> {
  await requireSession();
  const parsed = parseFoodForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }
  const { ingredients, note, ...data } = parsed.data;

  await prisma.food.create({
    data: {
      ...data,
      note: note || null,
      ingredients: { create: ingredients.map((name) => ({ name })) },
      statistic: { create: {} },
    },
  });

  revalidatePath("/", "layout");
  return { savedAt: Date.now() };
}

export async function updateFood(
  _prev: FoodFormState,
  formData: FormData
): Promise<FoodFormState> {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Thiếu id món" };

  const parsed = parseFoodForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }
  const { ingredients, note, ...data } = parsed.data;

  try {
    await prisma.$transaction([
      prisma.food.update({
        where: { id },
        data: { ...data, note: note || null },
      }),
      prisma.ingredient.deleteMany({ where: { foodId: id } }),
      prisma.ingredient.createMany({
        data: ingredients.map((name) => ({ foodId: id, name })),
      }),
    ]);
  } catch {
    return { error: "Không tìm thấy món để cập nhật" };
  }

  revalidatePath("/", "layout");
  return { savedAt: Date.now() };
}

export async function deleteFood(id: string): Promise<{ error?: string }> {
  await requireSession();
  try {
    await prisma.food.delete({ where: { id } });
  } catch {
    return { error: "Không tìm thấy món để xóa" };
  }
  revalidatePath("/", "layout");
  return {};
}

export interface ResetFavoritesResult {
  error?: string;
  /** How many dishes actually lost a rating — 0 means everything was already unrated. */
  resetCount?: number;
}

/**
 * Clear the favorite rating of every dish at once. Ratings feed the randomization score,
 * so this deliberately changes which dishes future plans favor; it cannot be undone.
 */
export async function resetAllFavorites(): Promise<ResetFavoritesResult> {
  await requireSession();
  try {
    const { count } = await prisma.food.updateMany({
      where: { favoriteScore: { not: 0 } }, // skip rows already at 0 so the count is meaningful
      data: { favoriteScore: 0 },
    });
    revalidatePath("/", "layout");
    return { resetCount: count };
  } catch {
    return {
      error: "Không xóa được đánh giá — kiểm tra mạng rồi thử lại nhé",
    };
  }
}

export async function setFavorite(
  id: string,
  score: number
): Promise<{ error?: string }> {
  await requireSession();
  const value = Math.max(0, Math.min(5, Math.round(score)));
  try {
    await prisma.food.update({ where: { id }, data: { favoriteScore: value } });
  } catch {
    return { error: "Không tìm thấy món" };
  }
  revalidatePath("/", "layout");
  return {};
}
