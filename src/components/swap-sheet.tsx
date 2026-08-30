"use client";

import { useEffect, useState, useTransition } from "react";
import { CircleSlash, Dices, Loader2, Search } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveSheet } from "@/components/responsive-sheet";

function FoodOptionRow({
  name,
  meta,
  onPick,
  disabled,
}: {
  name: string;
  meta: string;
  onPick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={disabled}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card px-3.5 py-2.5 text-left transition-colors hover:border-primary/50 hover:bg-secondary/40 disabled:opacity-50"
    >
      <span className="min-w-0">
        <span className="block truncate text-[15px] font-medium">{name}</span>
        <span className="block text-xs text-muted-foreground">{meta}</span>
      </span>
      <span className="shrink-0 text-xs font-semibold text-primary">Chọn</span>
    </button>
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
      else done("Đã bỏ món phụ khỏi bữa này");
    });

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isAddMode ? "Thêm món phụ" : `Đổi ${positionLabel}`}
      description={
        isAddMode ? (
          "Bữa này đang không có món phụ."
        ) : (
          <>
            Đang có:{" "}
            <span className="font-medium text-foreground">
              {item.food.name}
            </span>
          </>
        )
      }
    >
      <div className="flex flex-col gap-4">
        <Button
          onClick={onRandom}
          disabled={pending}
          variant="secondary"
          className="h-11 w-full font-semibold"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Dices className="size-4" />
          )}
          {isAddMode ? "Random món phụ" : "Random món khác"}
        </Button>

        <section>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Gợi ý phù hợp
          </p>
          <div className="flex flex-col gap-2">
            {suggestions === null ? (
              <>
                <Skeleton className="h-[58px] rounded-xl" />
                <Skeleton className="h-[58px] rounded-xl" />
                <Skeleton className="h-[58px] rounded-xl" />
              </>
            ) : suggestions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Chưa có gợi ý — thêm món mới ở tab Món ăn nhé.
              </p>
            ) : (
              suggestions.map((s) => (
                <FoodOptionRow
                  key={s.id}
                  name={s.name}
                  meta={`${s.cookingMethod} · ★ ${s.favoriteScore} · đã nấu ${s.totalCooked} lần`}
                  onPick={() => onPick(s.id, s.name)}
                  disabled={pending}
                />
              ))
            )}
          </div>
        </section>

        <section>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Chọn từ danh sách
          </p>
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm theo tên hoặc cách chế biến…"
              className="h-10 pl-9 text-base"
            />
          </div>
          <div className="flex max-h-56 flex-col gap-2 overflow-y-auto pb-1">
            {filtered.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">
                Không tìm thấy món phù hợp.
              </p>
            ) : (
              filtered.map((f) => (
                <FoodOptionRow
                  key={f.id}
                  name={f.name}
                  meta={`${f.cookingMethod}${f.favoriteScore > 0 ? ` · ★ ${f.favoriteScore}` : ""}`}
                  onPick={() => onPick(f.id, f.name)}
                  disabled={pending}
                />
              ))
            )}
          </div>
        </section>

        {item && position === "SIDE" ? (
          <Button
            onClick={onRemoveSide}
            disabled={pending}
            variant="outline"
            className="h-10 w-full font-medium text-muted-foreground"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CircleSlash className="size-4" />
            )}
            Bữa này không ăn món phụ
          </Button>
        ) : null}
      </div>
    </ResponsiveSheet>
  );
}
