import { describe, expect, it } from "vitest";
import {
  normalizeImportRow,
  parseFavoriteScore,
  parseFoodType,
  splitIngredients,
  type RawImportRow,
} from "../import-foods";

function raw(partial: Partial<RawImportRow>): RawImportRow {
  return {
    rowNumber: 2,
    name: "Gà kho sả",
    type: "Chính",
    cookingMethod: "Kho",
    ingredients: "Đùi gà, Sả",
    favorite: "4",
    note: "",
    ...partial,
  };
}

describe("parseFoodType", () => {
  it("nhận đủ biến thể có dấu / không dấu / tiếng Anh", () => {
    expect(parseFoodType("Chính")).toBe("MAIN");
    expect(parseFoodType("chinh")).toBe("MAIN");
    expect(parseFoodType("  Món chính ")).toBe("MAIN");
    expect(parseFoodType("MAIN")).toBe("MAIN");
    expect(parseFoodType("Phụ")).toBe("SIDE");
    expect(parseFoodType("phu")).toBe("SIDE");
    expect(parseFoodType("SIDE")).toBe("SIDE");
    expect(parseFoodType("mon phu")).toBe("SIDE");
  });

  it("giá trị lạ trả null", () => {
    expect(parseFoodType("")).toBeNull();
    expect(parseFoodType("Canh")).toBeNull();
    expect(parseFoodType("chinh phu")).toBeNull();
  });
});

describe("splitIngredients", () => {
  it("tách theo phẩy / chấm phẩy / xuống dòng", () => {
    expect(
      splitIngredients("Thịt heo, Trứng vịt ; Nước dừa\nHành tím")
    ).toEqual(["Thịt heo", "Trứng vịt", "Nước dừa", "Hành tím"]);
  });

  it("bỏ trùng không phân biệt hoa thường và bỏ phần rỗng", () => {
    expect(splitIngredients("Tỏi,, tỏi ,TỎI, Ớt")).toEqual(["Tỏi", "Ớt"]);
  });

  it("chuỗi rỗng trả mảng rỗng", () => {
    expect(splitIngredients("")).toEqual([]);
  });

  it("tối đa 30 nguyên liệu", () => {
    const many = Array.from({ length: 40 }, (_, i) => `nl${i}`).join(",");
    expect(splitIngredients(many)).toHaveLength(30);
  });
});

describe("parseFavoriteScore", () => {
  it("kẹp về 0..5 và làm tròn", () => {
    expect(parseFavoriteScore("4")).toBe(4);
    expect(parseFavoriteScore("4.6")).toBe(5);
    expect(parseFavoriteScore("4,4")).toBe(4);
    expect(parseFavoriteScore("7")).toBe(5);
    expect(parseFavoriteScore("-1")).toBe(0);
  });

  it("rỗng hoặc không phải số về 0", () => {
    expect(parseFavoriteScore("")).toBe(0);
    expect(parseFavoriteScore("yes")).toBe(0);
  });
});

describe("normalizeImportRow", () => {
  it("dòng chuẩn ra valid với dữ liệu sạch", () => {
    const row = normalizeImportRow(raw({ note: "  ngon  " }));
    expect(row.status).toBe("valid");
    if (row.status === "valid") {
      expect(row.data).toEqual({
        name: "Gà kho sả",
        type: "MAIN",
        cookingMethod: "Kho",
        ingredients: ["Đùi gà", "Sả"],
        favoriteScore: 4,
        note: "ngon",
      });
    }
  });

  it("thiếu tên -> error", () => {
    const row = normalizeImportRow(raw({ name: "   " }));
    expect(row.status).toBe("error");
    if (row.status === "error") expect(row.message).toContain("Thiếu tên");
  });

  it("loại không hợp lệ -> error", () => {
    const row = normalizeImportRow(raw({ type: "Tráng miệng" }));
    expect(row.status).toBe("error");
  });

  it("cách chế biến rỗng mặc định 'Khác', ghi chú rỗng thành null", () => {
    const row = normalizeImportRow(raw({ cookingMethod: "  ", note: "" }));
    expect(row.status).toBe("valid");
    if (row.status === "valid") {
      expect(row.data.cookingMethod).toBe("Khác");
      expect(row.data.note).toBeNull();
    }
  });
});
