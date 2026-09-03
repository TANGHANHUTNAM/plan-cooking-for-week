"use client";

import { useEffect, useState, useTransition } from "react";
import { CircleSlash, Dices, Search, SearchX, X } from "lucide-react";
import { toast } from "sonner";
import {
  addMealItem,
  loadSwapFoods,
  removeSideDish,
  setItemFood,
  suggestForItem,
  suggestForMeal,
  swapItemRandom,
  type SuggestionDTO,
} from "@/actions/plans";
import type { SwapFoodDTO, SwapItemDTO } from "@/lib/dto";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { FoodTypeTile } from "@/components/food-type";
import { RatingStars } from "@/components/rating-stars";
import { ResponsiveSheet } from "@/components/responsive-sheet";

function cookedLabel(total: number): string {
  return total > 0 ? `đã nấu ${total} lần` : "chưa nấu lần nào";
}

function FoodOption({
  name,
  method,
  detail,
  score,
  onPick,
  disabled,
}: {
  name: string;
  method: string;
  detail: string;
  score: number;
  onPick: () => void;
  disabled: boolean;
}) {
  return (
    <Item asChild variant="outline" size="sm">
      <button
        type="button"
        onClick={onPick}
        disabled={disabled}
        className="w-full text-left transition-colors hover:border-primary/50 hover:bg-secondary/40 disabled:pointer-events-none disabled:opacity-50"
      >
        <ItemContent>
          <ItemTitle className="text-sm">{name}</ItemTitle>
          <ItemDescription className="text-sm">
            {method}, {detail}
          </ItemDescription>
        </ItemContent>
        <ItemActions>
          <RatingStars value={score} />
        </ItemActions>
      </button>
    </Item>
  );
}

/**
 * Bottom sheet for one food position in a meal.
 * - item != null: replace the existing food (side dishes also offer "remove side dish").
 * - item == null: empty position -> add a food (random / suggested / manual).
 */
export function SwapSheet({
  mealId,
  position,
  item,
  open,
  onOpenChange,
}: {
  mealId: string;
  position: "MAIN" | "SIDE";
  item: SwapItemDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [suggestions, setSuggestions] = useState<SuggestionDTO[] | null>(null);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [foods, setFoods] = useState<SwapFoodDTO[] | null>(null);
  const [foodsError, setFoodsError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();

  const positionLabel = position === "MAIN" ? "món chính" : "món phụ";
  const isAddMode = item === null;

  // The sheet mounts only after a swap control is invoked, so load its data on demand.
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const load = async () => {
      try {
        const [suggestionResult, foodsResult] = await Promise.all([
          item ? suggestForItem(item.id) : suggestForMeal(mealId, position),
          loadSwapFoods(),
        ]);
        if (cancelled) return;

        if (suggestionResult.error) {
          setSuggestionError(suggestionResult.error);
          setSuggestions([]);
          toast.error(suggestionResult.error);
        } else {
          setSuggestionError(null);
          setSuggestions(suggestionResult.suggestions ?? []);
        }

        if (foodsResult.error) {
          setFoodsError(foodsResult.error);
          setFoods([]);
          toast.error(foodsResult.error);
        } else {
          setFoodsError(null);
          setFoods(foodsResult.foods ?? []);
        }
      } catch {
        if (cancelled) return;
        const error =
          "Không tải được dữ liệu đổi món — kiểm tra mạng rồi thử lại nhé";
        setSuggestionError(error);
        setSuggestions([]);
        setFoodsError(error);
        setFoods([]);
        toast.error(error);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [item, mealId, open, position]);

  const pool = (foods ?? []).filter(
    (f) => f.type === position && f.id !== item?.food.id
  );
  const q = query.trim().toLowerCase();
  const filtered = q
    ? pool.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.cookingMethod.toLowerCase().includes(q)
      )
    : pool;

  const done = (message: string) => {
    toast.success(message);
    onOpenChange(false);
  };

  const onRandom = () =>
    startTransition(async () => {
      const res = item
        ? await swapItemRandom(item.id)
        : await addMealItem(mealId, position);
      if (res.error) toast.error(res.error);
      else done(item ? "Đã đổi sang món khác" : `Đã thêm ${positionLabel}`);
    });

  const onPick = (foodId: string, name: string) =>
    startTransition(async () => {
      const res = item
        ? await setItemFood(item.id, foodId)
        : await addMealItem(mealId, position, foodId);
      if (res.error) toast.error(res.error);
      else done(isAddMode ? `Đã thêm “${name}”` : `Đã đổi sang “${name}”`);
    });

  const onRemoveSide = () =>
    startTransition(async () => {
      if (!item) return;
      const res = await removeSideDish(item.id);
      if (res.error) toast.error(res.error);
      else done("Bữa này sẽ không có món phụ");
    });

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      icon={
        <FoodTypeTile
          type={position}
          className="size-7"
          iconClassName="size-4"
        />
      }
      title={isAddMode ? `Thêm ${positionLabel}` : `Đổi ${positionLabel}`}
      description={
        isAddMode ? (
          `Bữa này đang chưa có ${positionLabel}.`
        ) : (
          <>
            Đang là{" "}
            <span className="font-medium text-foreground">
              {item.food.name}
            </span>
          </>
        )
      }
    >
      <div className="flex flex-col gap-6">
        <Button
          onClick={onRandom}
          disabled={pending}
          variant="secondary"
          size="lg"
          className="h-11 w-full text-sm font-semibold"
        >
          {pending ? <Spinner /> : <Dices />}
          {isAddMode ? `Random ${positionLabel}` : "Random món khác"}
        </Button>

        <section>
          <h3 className="mb-3 text-base font-semibold">Gợi ý hợp bữa này</h3>
          <ItemGroup className="gap-2">
            {suggestions === null ? (
              <>
                <Skeleton className="h-[54px] rounded-md" />
                <Skeleton className="h-[54px] rounded-md" />
                <Skeleton className="h-[54px] rounded-md" />
              </>
            ) : suggestionError ? (
              <p className="text-sm text-destructive">{suggestionError}</p>
            ) : suggestions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Chưa gợi ý được món nào. Thêm món mới ở tab Món ăn trước nhé.
              </p>
            ) : (
              suggestions.map((s) => (
                <FoodOption
                  key={s.id}
                  name={s.name}
                  method={s.cookingMethod}
                  detail={cookedLabel(s.totalCooked)}
                  score={s.favoriteScore}
                  onPick={() => onPick(s.id, s.name)}
                  disabled={pending}
                />
              ))
            )}
          </ItemGroup>
        </section>

        <section>
          <h3 className="mb-3 text-base font-semibold">
            Hoặc chọn từ danh sách
          </h3>
          <InputGroup className="mb-3 h-11">
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm theo tên hoặc cách chế biến"
              aria-label="Tìm món ăn"
              className="h-11 text-base"
            />
            {query ? (
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  size="icon-xs"
                  aria-label="Xóa từ khóa tìm"
                  onClick={() => setQuery("")}
                >
                  <X />
                </InputGroupButton>
              </InputGroupAddon>
            ) : null}
          </InputGroup>

          {foods === null ? (
            <ItemGroup className="gap-2">
              <Skeleton className="h-[54px] rounded-md" />
              <Skeleton className="h-[54px] rounded-md" />
              <Skeleton className="h-[54px] rounded-md" />
            </ItemGroup>
          ) : foodsError ? (
            <p className="py-3 text-sm text-destructive">{foodsError}</p>
          ) : filtered.length === 0 ? (
            <p className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
              <SearchX className="size-4 shrink-0" />
              Không có món nào khớp từ khóa này.
            </p>
          ) : (
            <ScrollArea className="scrollbar-thin -mr-2 h-60 max-h-60 pr-2">
              <ItemGroup className="gap-2">
                {filtered.map((f) => (
                  <FoodOption
                    key={f.id}
                    name={f.name}
                    method={f.cookingMethod}
                    detail={cookedLabel(f.totalCooked)}
                    score={f.favoriteScore}
                    onPick={() => onPick(f.id, f.name)}
                    disabled={pending}
                  />
                ))}
              </ItemGroup>
            </ScrollArea>
          )}
        </section>

        {item && position === "SIDE" ? (
          <Button
            onClick={onRemoveSide}
            disabled={pending}
            variant="outline"
            size="lg"
            className="h-10 w-full text-sm text-muted-foreground"
          >
            {pending ? <Spinner /> : <CircleSlash />}
            Bữa này không ăn món phụ
          </Button>
        ) : null}
      </div>
    </ResponsiveSheet>
  );
}
