// Chuẩn hóa dữ liệu import món ăn từ Excel — hàm thuần, có unit test.

export const MAX_IMPORT_ROWS = 200;

/** Nội dung thô đọc từ 1 dòng Excel (cột A→F). */
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
    .replace(/[̀-ͯ]/g, "") // dải dấu kết hợp sau khi tách NFD
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

/** "Chính"/"chinh"/"MAIN"/"Món chính" -> MAIN; "Phụ"/"side"... -> SIDE; khác -> null. */
export function parseFoodType(raw: string): "MAIN" | "SIDE" | null {
  const v = stripDiacritics(raw.trim().toLowerCase());
  if (["chinh", "mon chinh", "main"].includes(v)) return "MAIN";
  if (["phu", "mon phu", "side"].includes(v)) return "SIDE";
  return null;
}

/** Tách nguyên liệu theo dấu phẩy / chấm phẩy / xuống dòng, bỏ trùng, tối đa 30. */
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

/** "4" -> 4; ngoài khoảng thì kẹp về 0..5; không phải số -> 0. */
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
