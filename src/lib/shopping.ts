// Aggregate shopping ingredients — a pure function shared by server and client.

export interface ShoppingDish {
  name: string;
  /** Main or side dish — shown as an icon on the shopping card. */
  position: "MAIN" | "SIDE";
  ingredients: string[];
}

export interface ShoppingMeal {
  dateISO: string;
  period: "LUNCH" | "DINNER";
  /** Meal note (e.g. missing fish sauce) — also shown in Shopping. */
  note?: string | null;
  dishes: ShoppingDish[];
}

export interface ShoppingEntry {
  name: string;
  /** Names of foods that use this ingredient. */
  dishes: string[];
  count: number;
}

export interface ShoppingExtra {
  id: string;
  dateISO: string;
  name: string;
  purchased: boolean;
}

/** Stable ingredient key: preserve accents, trim whitespace, and ignore case. */
export function normalizeIngredientKey(name: string): string {
  return name.normalize("NFC").trim().toLocaleLowerCase("vi-VN");
}

/** Merge ingredients from selected meals; add counts for duplicate names, ignoring case. */
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
