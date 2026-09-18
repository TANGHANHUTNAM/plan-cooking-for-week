import {
  CookingPot,
  Fish,
  Flame,
  Salad,
  Soup,
  UtensilsCrossed,
} from "lucide-react";

/** Code-native dish illustrations keep the reel lightweight without image downloads. */
export function FoodChestArtwork({
  name,
  method,
}: {
  name: string;
  method: string;
}) {
  const text = `${name} ${method}`.toLocaleLowerCase("vi");
  const Icon = /canh|súp|cháo|bún|phở|mì/.test(text)
    ? Soup
    : /rau|gỏi|salad/.test(text)
      ? Salad
      : /cá|tôm|mực/.test(text)
        ? Fish
        : /nướng|chiên|xào/.test(text)
          ? Flame
          : /kho|hầm|luộc/.test(text)
            ? CookingPot
            : UtensilsCrossed;
  return (
    <div className="food-chest-dish" aria-hidden="true">
      <div className="food-chest-dish-plate">
        <Icon strokeWidth={1.2} />
      </div>
    </div>
  );
}
