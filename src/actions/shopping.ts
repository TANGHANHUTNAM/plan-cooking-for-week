"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { dateToISO, isoToDate, weekStartISO } from "@/lib/week";
import { normalizeIngredientKey, type ShoppingExtra } from "@/lib/shopping";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidISODate(value: string): boolean {
  if (!ISO_DATE_RE.test(value)) return false;
  const date = isoToDate(value);
  return Number.isFinite(date.getTime()) && dateToISO(date) === value;
}

const weekStartSchema = z
  .string()
  .refine(isValidISODate, "Tuần không hợp lệ")
  .refine(
    (value) => weekStartISO(value) === value,
    "Tuần phải bắt đầu từ Thứ 2"
  );

const ingredientStateSchema = z.object({
  weekStart: weekStartSchema,
  ingredientName: z.string().trim().min(1).max(100),
  checked: z.boolean(),
});

const extraInputSchema = z.object({
  dateISO: z.string().refine(isValidISODate, "Ngày không hợp lệ"),
  name: z
    .string()
    .trim()
    .min(1, "Nhập tên món đồ")
    .max(100, "Tên đồ mua thêm quá dài"),
});

const extraIdSchema = z.string().trim().min(1).max(100);

export interface ShoppingActionResult {
  error?: string;
  extra?: ShoppingExtra;
}

async function requireSession(): Promise<void> {
  const session = await getSession();
  if (!session) throw new Error("Chưa đăng nhập");
}

/** Toggle an ingredient by its normalized key, shared by the household for one week. */
export async function setShoppingIngredientChecked(
  weekStart: string,
  ingredientName: string,
  checked: boolean
): Promise<ShoppingActionResult> {
  await requireSession();

  const parsed = ingredientStateSchema.safeParse({
    weekStart,
    ingredientName,
    checked,
  });
  if (!parsed.success) {
    return { error: "Dữ liệu nguyên liệu không hợp lệ" };
  }

  const ingredientKey = normalizeIngredientKey(parsed.data.ingredientName);
  if (!ingredientKey) return { error: "Tên nguyên liệu không hợp lệ" };

  try {
    if (parsed.data.checked) {
      await prisma.shoppingIngredientCheck.upsert({
        where: {
          weekStart_ingredientKey: {
            weekStart: isoToDate(parsed.data.weekStart),
            ingredientKey,
          },
        },
        update: {},
        create: {
          weekStart: isoToDate(parsed.data.weekStart),
          ingredientKey,
        },
      });
    } else {
      await prisma.shoppingIngredientCheck.deleteMany({
        where: {
          weekStart: isoToDate(parsed.data.weekStart),
          ingredientKey,
        },
      });
    }
  } catch {
    return {
      error: "Không lưu được trạng thái — kiểm tra mạng rồi thử lại nhé",
    };
  }

  revalidatePath("/shopping");
  return {};
}

/** Add an extra item to the selected date, shared by the household. */
export async function addShoppingExtra(
  dateISO: string,
  name: string
): Promise<ShoppingActionResult> {
  await requireSession();

  const parsed = extraInputSchema.safeParse({ dateISO, name });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  try {
    const extra = await prisma.shoppingExtra.create({
      data: {
        date: isoToDate(parsed.data.dateISO),
        name: parsed.data.name,
      },
      select: { id: true, date: true, name: true, purchased: true },
    });

    revalidatePath("/shopping");
    return {
      extra: {
        id: extra.id,
        dateISO: dateToISO(extra.date),
        name: extra.name,
        purchased: extra.purchased,
      },
    };
  } catch {
    return { error: "Không thêm được — kiểm tra mạng rồi thử lại nhé" };
  }
}

/** Check or uncheck an extra shopping item. */
export async function setShoppingExtraPurchased(
  extraId: string,
  purchased: boolean
): Promise<ShoppingActionResult> {
  await requireSession();

  const parsed = z
    .object({ id: extraIdSchema, purchased: z.boolean() })
    .safeParse({ id: extraId, purchased });
  if (!parsed.success) return { error: "Món mua thêm không hợp lệ" };

  try {
    await prisma.shoppingExtra.update({
      where: { id: parsed.data.id },
      data: { purchased: parsed.data.purchased },
    });
  } catch {
    return { error: "Không cập nhật được — kiểm tra mạng rồi thử lại nhé" };
  }

  revalidatePath("/shopping");
  return {};
}

/** Delete an extra shopping item. */
export async function deleteShoppingExtra(
  extraId: string
): Promise<ShoppingActionResult> {
  await requireSession();

  const parsed = extraIdSchema.safeParse(extraId);
  if (!parsed.success) return { error: "Món mua thêm không hợp lệ" };

  try {
    await prisma.shoppingExtra.delete({ where: { id: parsed.data } });
  } catch {
    return { error: "Không xóa được — kiểm tra mạng rồi thử lại nhé" };
  }

  revalidatePath("/shopping");
  return {};
}
