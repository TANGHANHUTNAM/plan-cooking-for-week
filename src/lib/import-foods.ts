// Normalize food-import data from Excel — a pure function covered by unit tests.

export const MAX_IMPORT_ROWS = 200;

/** Raw contents read from one Excel row (columns A→F). */
export interface RawImportRow {
  rowNumber: number;
  name: string;
  type: string;
  cookingMethod: string;
  ingredients: string;
  favorite: string;
  note: string;
}

export interface ImportFoodData {
  name: string;
  type: "MAIN" | "SIDE";
  cookingMethod: string;
  ingredients: string[];
  favoriteScore: number;
  note: string | null;
}

export type PreviewRow =
  | { rowNumber: number; status: "valid"; data: ImportFoodData }
  | { rowNumber: number; status: "duplicate"; data: ImportFoodData }
  | { rowNumber: number; status: "error"; name: string; message: string };

export function stripDiacritics(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // combining marks after NFD decomposition
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

/** Map main-dish labels to MAIN, side-dish labels to SIDE, and other values to null. */
export function parseFoodType(raw: string): "MAIN" | "SIDE" | null {
  const v = stripDiacritics(raw.trim().toLowerCase());
  if (["chinh", "mon chinh", "main"].includes(v)) return "MAIN";
  if (["phu", "mon phu", "side"].includes(v)) return "SIDE";
  return null;
}

/** Split ingredients on commas, semicolons, or newlines; deduplicate; limit to 30. */
export function splitIngredients(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[,;\n]/)) {
    const name = part.trim().slice(0, 60);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
    if (out.length >= 30) break;
  }
  return out;
}

/** Parse "4" as 4; clamp out-of-range values to 0..5; non-numbers become 0. */
export function parseFavoriteScore(raw: string): number {
  const n = Number.parseFloat(raw.trim().replace(",", "."));
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(5, Math.round(n)));
}

export function normalizeImportRow(raw: RawImportRow): PreviewRow {
  const name = raw.name.trim();
  if (!name) {
    return {
      rowNumber: raw.rowNumber,
      status: "error",
      name: "",
      message: "Thiếu tên món",
    };
  }
  if (name.length > 100) {
    return {
      rowNumber: raw.rowNumber,
      status: "error",
      name,
      message: "Tên món quá dài (tối đa 100 ký tự)",
    };
  }

  const type = parseFoodType(raw.type);
  if (!type) {
    return {
      rowNumber: raw.rowNumber,
      status: "error",
      name,
      message: 'Cột Loại phải là "Chính" hoặc "Phụ"',
    };
  }

  const note = raw.note.trim().slice(0, 500);
  return {
    rowNumber: raw.rowNumber,
    status: "valid",
    data: {
      name,
      type,
      cookingMethod: raw.cookingMethod.trim().slice(0, 50) || "Khác",
      ingredients: splitIngredients(raw.ingredients),
      favoriteScore: parseFavoriteScore(raw.favorite),
      note: note || null,
    },
  };
}
