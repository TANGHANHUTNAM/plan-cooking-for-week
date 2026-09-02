"use client";

import { useEffect, useState, useTransition } from "react";
import { CircleSlash, Dices, Search, SearchX, X } from "lucide-react";
import { toast } from "sonner";
import {
  addSideDish,
  removeSideDish,
  setItemFood,
  suggestForItem,
  suggestSideForMeal,
  swapItemRandom,
  type SuggestionDTO,
} from "@/actions/plans";
import type { FoodDTO, MealItemDTO } from "@/lib/dto";
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
          <ItemDescription>
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
 * Bottom sheet cho một vị trí món trong bữa.
 * - item != null: đổi món đang có (món phụ có thêm lựa chọn "bỏ món phụ").
 * - item == null: bữa đang trống món phụ -> thêm mới (random / gợi ý / chọn tay).
 */
export function SwapSheet({
  mealId,
  position,
  item,
  foods,
  open,
  onOpenChange,
}: {
  mealId: string;
  position: "MAIN" | "SIDE";
  item: MealItemDTO | null;
  foods: FoodDTO[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [suggestions, setSuggestions] = useState<SuggestionDTO[] | null>(null);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();

  const positionLabel = position === "MAIN" ? "món chính" : "món phụ";
  const isAddMode = item === null;

  // component được mount mới mỗi lần mở sheet nên chỉ cần fetch 1 lần
  useEffect(() => {
    let cancelled = false;
    const load = item ? suggestForItem(item.id) : suggestSideForMeal(mealId);
    load.then((res) => {
      if (!cancelled) setSuggestions(res.suggestions ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [item, mealId]);

  const pool = foods.filter(
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
        : await addSideDish(mealId);
      if (res.error) toast.error(res.error);
      else done(item ? "Đã đổi sang món khác" : "Đã thêm món phụ");
    });

  const onPick = (foodId: string, name: string) =>
    startTransition(async () => {
      const res = item
        ? await setItemFood(item.id, foodId)
        : await addSideDish(mealId, foodId);
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
      title={isAddMode ? "Thêm món phụ" : `Đổi ${positionLabel}`}
      description={
        isAddMode ? (
          "Bữa này đang chưa có món phụ."
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
      <div className="flex flex-col gap-5">
        <Button
          onClick={onRandom}
          disabled={pending}
          variant="secondary"
          size="lg"
          className="h-11 w-full text-sm font-semibold"
        >
          {pending ? <Spinner /> : <Dices />}
          {isAddMode ? "Random món phụ" : "Random món khác"}
        </Button>

        <section>
          <h3 className="mb-2 text-sm font-semibold">Gợi ý hợp bữa này</h3>
          <ItemGroup className="gap-2">
            {suggestions === null ? (
              <>
                <Skeleton className="h-[54px] rounded-md" />
                <Skeleton className="h-[54px] rounded-md" />
                <Skeleton className="h-[54px] rounded-md" />
              </>
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
          <h3 className="mb-2 text-sm font-semibold">Hoặc chọn từ danh sách</h3>
          <InputGroup className="mb-2 h-10">
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm theo tên hoặc cách chế biến"
              aria-label="Tìm món ăn"
              className="h-10 text-base md:text-sm"
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

          {filtered.length === 0 ? (
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
