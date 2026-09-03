import { Soup, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shared food-type convention across the app:
 *   main dish (savory food served with rice) = crossed fork and knife, green tone, solid tile
 *   side dish (soup or vegetable)             = soup bowl, gray tone, outlined tile
 * Used in Foods, meal cards, Shopping, food forms, and import previews
 * so users only need to learn the convention once.
 */
export const FOOD_TYPE_META = {
  MAIN: {
    label: "Món chính",
    icon: UtensilsCrossed,
    tile: "border border-primary/10 bg-secondary text-primary",
    tone: "text-primary",
  },
  SIDE: {
    label: "Món phụ",
    icon: Soup,
    tile: "border border-border bg-muted/30 text-muted-foreground",
    tone: "text-muted-foreground",
  },
} as const;

export type FoodType = keyof typeof FOOD_TYPE_META;

/** Icon tile with a background — used when the food is a standalone item (food card, import row). */
export function FoodTypeTile({
  type,
  className,
  iconClassName,
}: {
  type: FoodType;
  className?: string;
  iconClassName?: string;
}) {
  const { label, icon: Icon, tile } = FOOD_TYPE_META[type];
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-md",
        tile,
        className
      )}
    >
      <Icon className={iconClassName} strokeWidth={2} aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** Bare icon — used in a meal row, where a lighter treatment is preferable. */
export function FoodTypeIcon({
  type,
  className,
}: {
  type: FoodType;
  className?: string;
}) {
  const { label, icon: Icon, tone } = FOOD_TYPE_META[type];
  return (
    <span className={cn("inline-flex shrink-0", tone, className)}>
      <Icon className="size-full" strokeWidth={2} aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}
