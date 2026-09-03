// Gom nguyên liệu đi chợ — hàm thuần, dùng được cả server lẫn client.

export interface ShoppingDish {
  name: string;
  /** món chính hay món phụ — hiện thành biểu tượng trên thẻ đi chợ */
  position: "MAIN" | "SIDE";
  ingredients: string[];
}

export interface ShoppingMeal {
  dateISO: string;
  period: "LUNCH" | "DINNER";
  /** ghi chú của bữa (vd: thiếu nước mắm) — hiện kèm khi đi chợ */
  note?: string | null;
  dishes: ShoppingDish[];
}

export interface ShoppingEntry {
  name: string;
  /** tên các món cần nguyên liệu này */
  dishes: string[];
  count: number;
}

export interface ShoppingExtra {
  id: string;
  dateISO: string;
  name: string;
  purchased: boolean;
}

/** Khóa bền vững cho nguyên liệu: giữ dấu, bỏ khoảng trắng đầu/cuối và không phân biệt hoa thường. */
export function normalizeIngredientKey(name: string): string {
  return name.normalize("NFC").trim().toLocaleLowerCase("vi-VN");
}

/** Gộp nguyên liệu của các bữa đã cho, trùng tên (không phân biệt hoa thường) thì cộng dồn. */
export function aggregateIngredients(meals: ShoppingMeal[]): ShoppingEntry[] {
  const map = new Map<string, ShoppingEntry>();
  for (const meal of meals) {
    for (const dish of meal.dishes) {
      for (const raw of dish.ingredients) {
        const name = raw.trim();
        const key = normalizeIngredientKey(raw);
        if (!key) continue;
        const entry = map.get(key);
        if (entry) {
          entry.count += 1;
          if (!entry.dishes.includes(dish.name)) entry.dishes.push(dish.name);
        } else {
          map.set(key, { name, dishes: [dish.name], count: 1 });
        }
      }
    }
  }
  return [...map.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "vi", { sensitivity: "base" })
  );
}
