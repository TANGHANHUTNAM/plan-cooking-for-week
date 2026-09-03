"use server";

import { revalidatePath } from "next/cache";
import { Workbook } from "exceljs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { foodSchema } from "@/lib/validations";
import {
  MAX_IMPORT_ROWS,
  normalizeImportRow,
  type ImportFoodData,
  type PreviewRow,
  type RawImportRow,
} from "@/lib/import-foods";

async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("Chưa đăng nhập");
  return session;
}

const foodKey = (name: string, type: string) =>
  `${name.trim().toLowerCase()}|${type}`;

async function loadExistingFoodKeys(): Promise<Set<string>> {
  const existing = await prisma.food.findMany({
    select: { name: true, type: true },
  });
  return new Set(existing.map((f) => foodKey(f.name, f.type)));
}

export interface ParseImportResult {
  error?: string;
  rows?: PreviewRow[];
}

/** Read an Excel file and return a per-row preview (valid / duplicate / error) without writing to the DB. */
export async function parseImportExcel(
  formData: FormData
): Promise<ParseImportResult> {
  await requireSession();

  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "Chưa chọn file" };
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return {
      error: "Chỉ nhận file Excel .xlsx — tải file mẫu để đúng định dạng",
    };
  }
  if (file.size > 4 * 1024 * 1024)
    return { error: "File quá lớn (tối đa 4MB)" };

  const workbook = new Workbook();
  try {
    await workbook.xlsx.load(await file.arrayBuffer());
  } catch {
    return {
      error: "Không đọc được file — có đúng là file Excel .xlsx không?",
    };
  }

  const sheet = workbook.getWorksheet("Món ăn") ?? workbook.worksheets[0];
  if (!sheet) return { error: "File không có sheet dữ liệu nào" };

  const raws: RawImportRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // header row
    raws.push({
      rowNumber,
      name: row.getCell(1).text ?? "",
      type: row.getCell(2).text ?? "",
      cookingMethod: row.getCell(3).text ?? "",
      ingredients: row.getCell(4).text ?? "",
      favorite: row.getCell(5).text ?? "",
      note: row.getCell(6).text ?? "",
    });
  });

  const nonEmpty = raws.filter((r) =>
    [r.name, r.type, r.cookingMethod, r.ingredients, r.note].some(
      (v) => v.trim() !== ""
    )
  );
  if (nonEmpty.length === 0) {
    return { error: "File chưa có dòng dữ liệu nào — điền món từ dòng 2 nhé" };
  }
  if (nonEmpty.length > MAX_IMPORT_ROWS) {
    return {
      error: `Tối đa ${MAX_IMPORT_ROWS} món mỗi lần nhập (file đang có ${nonEmpty.length} dòng)`,
    };
  }

  const normalized = nonEmpty.map(normalizeImportRow);

  // mark duplicates: against existing app foods and duplicates within the file
  const existingKeys = await loadExistingFoodKeys();
  const seenInFile = new Set<string>();
  const rows: PreviewRow[] = normalized.map((r) => {
    if (r.status !== "valid") return r;
    const key = foodKey(r.data.name, r.data.type);
    if (existingKeys.has(key) || seenInFile.has(key)) {
      return { rowNumber: r.rowNumber, status: "duplicate", data: r.data };
    }
    seenInFile.add(key);
    return r;
  });

  return { rows };
}

export interface ImportFoodsResult {
  error?: string;
  imported?: number;
  skipped?: number;
}

/** Write valid foods to the DB (three queries grouped in one transaction). */
export async function importFoods(
  rows: ImportFoodData[]
): Promise<ImportFoodsResult> {
  await requireSession();

  if (!Array.isArray(rows) || rows.length === 0) {
    return { error: "Không có món nào để nhập" };
  }
  if (rows.length > MAX_IMPORT_ROWS) {
    return { error: `Tối đa ${MAX_IMPORT_ROWS} món mỗi lần nhập` };
  }

  // do not trust client data — validate each row again with the shared schema
  const validated: ImportFoodData[] = [];
  for (const row of rows) {
    const parsed = foodSchema.safeParse({ ...row, note: row.note ?? "" });
    if (!parsed.success)
      return { error: "Dữ liệu gửi lên không hợp lệ — chọn lại file nhé" };
    const { note, ...rest } = parsed.data;
    validated.push({ ...rest, note: note || null });
  }

  // final deduplication (within the batch and against the DB)
  const existingKeys = await loadExistingFoodKeys();
  const seen = new Set<string>();
  const toCreate = validated.filter((r) => {
    const key = foodKey(r.name, r.type);
    if (existingKeys.has(key) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (toCreate.length === 0) {
    return { imported: 0, skipped: rows.length };
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        const created = await tx.food.createManyAndReturn({
          data: toCreate.map((r) => ({
            name: r.name,
            type: r.type,
            cookingMethod: r.cookingMethod,
            favoriteScore: r.favoriteScore,
            note: r.note,
          })),
          select: { id: true, name: true, type: true },
        });
        const idByKey = new Map(
          created.map((f) => [foodKey(f.name, f.type), f.id])
        );

        const ingredientRows = toCreate.flatMap((r) => {
          const foodId = idByKey.get(foodKey(r.name, r.type));
          if (!foodId) return [];
          return r.ingredients.map((name) => ({ foodId, name }));
        });
        if (ingredientRows.length > 0) {
          await tx.ingredient.createMany({ data: ingredientRows });
        }
        await tx.foodStatistic.createMany({
          data: created.map((f) => ({ foodId: f.id })),
        });
      },
      { timeout: 20000 }
    );
  } catch {
    return { error: "Không lưu được — kiểm tra mạng rồi thử lại nhé" };
  }

  revalidatePath("/", "layout");
  return { imported: toCreate.length, skipped: rows.length - toCreate.length };
}
