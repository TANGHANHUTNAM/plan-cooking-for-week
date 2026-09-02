import { Soup, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Quy ước chung cho loại món trong toàn app:
 *   món chính (món mặn ăn với cơm) = dao dĩa bắt chéo, tông xanh, ô tô đặc
 *   món phụ   (canh hoặc rau)      = tô canh,           tông xám,  ô viền rỗng
 * Dùng ở tab Món ăn, thẻ bữa ăn, đi chợ, form thêm món và xem trước import
 * để người dùng chỉ phải học một lần.
 */
export const FOOD_TYPE_META = {
  MAIN: {
    label: "Món chính",
    icon: UtensilsCrossed,
    tile: "bg-secondary text-primary",
    tone: "text-primary",
  },
  SIDE: {
    label: "Món phụ",
    icon: Soup,
    tile: "border border-border bg-card text-muted-foreground",
    tone: "text-muted-foreground",
  },
} as const;

export type FoodType = keyof typeof FOOD_TYPE_META;

/** Ô biểu tượng có nền — dùng khi món là một mục riêng (thẻ món, dòng import). */
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

/** Biểu tượng trần — dùng trong dòng món của một bữa, nơi cần nhẹ nhàng hơn. */
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
