"use client";

import { useOptimistic, useState, useTransition } from "react";
import {
  ArrowLeftRight,
  CheckCircle2,
  Loader2,
  MoonStar,
  Plus,
  StickyNote,
  Sun,
  Undo2,
  UserX,
} from "lucide-react";
import { toast } from "sonner";
import {
  markCooked,
  setMealNote,
  toggleMealAbsence,
  undoCooked,
} from "@/actions/plans";
import type { FoodDTO, MealDTO, MealItemDTO, MemberDTO } from "@/lib/dto";
import { APP_TZ } from "@/lib/week";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SwapSheet } from "@/components/swap-sheet";

const PERIOD_META = {
  LUNCH: { label: "Trưa", icon: Sun },
  DINNER: { label: "Tối", icon: MoonStar },
} as const;

function cookedTime(iso: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: APP_TZ,
  }).format(new Date(iso));
}

export function MealCard({
  meal,
  foods,
  members,
  variant,
}: {
  meal: MealDTO;
  foods: FoodDTO[];
  members: MemberDTO[];
  variant: "full" | "compact";
}) {
  const [sheet, setSheet] = useState<{
    position: "MAIN" | "SIDE";
    item: MealItemDTO | null;
  } | null>(null);
  const [noteDraft, setNoteDraft] = useState<string | null>(null); // null = không sửa
  const [pending, startTransition] = useTransition();

  // đánh dấu ăn/không ăn đổi ngay trên UI, server xác nhận sau
  const [absentIds, toggleAbsentOptimistic] = useOptimistic(
    new Set(meal.absentUserIds),
    (state: ReadonlySet<string>, userId: string) => {
      const next = new Set(state);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    }
  );

  const { label, icon: PeriodIcon } = PERIOD_META[meal.period];
  const main = meal.items.find((i) => i.position === "MAIN");
  const side = meal.items.find((i) => i.position === "SIDE");
  const cooked = meal.cookedAt !== null;
  const eatingCount = members.filter((m) => !absentIds.has(m.id)).length;
  const absentMembers = members.filter((m) => absentIds.has(m.id));

  const ingredients = [
    ...new Set(meal.items.flatMap((i) => i.food.ingredients)),
  ];

  const onMarkCooked = () =>
    startTransition(async () => {
      const res = await markCooked(meal.id);
      if (res.error) toast.error(res.error);
      else toast.success(`Đã ghi nhận bữa ${label.toLowerCase()} 🎉`);
    });

  const onUndo = () =>
    startTransition(async () => {
      const res = await undoCooked(meal.id);
      if (res.error) toast.error(res.error);
      else toast.success("Đã hoàn tác");
    });

  const onToggleAbsence = (userId: string) =>
    startTransition(async () => {
      toggleAbsentOptimistic(userId);
      const res = await toggleMealAbsence(meal.id, userId);
      if (res.error) toast.error(res.error);
    });

  const saveNote = (value: string) =>
    startTransition(async () => {
      const res = await setMealNote(meal.id, value);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(value.trim() ? "Đã lưu ghi chú" : "Đã xóa ghi chú");
      setNoteDraft(null);
    });

  const swapButton = (item: MealItemDTO) => (
    <button
      type="button"
      aria-label={`Đổi ${item.position === "MAIN" ? "món chính" : "món phụ"}`}
      onClick={() => setSheet({ position: item.position, item })}
      className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ArrowLeftRight className="size-4" />
    </button>
  );

  const openAddSide = () => setSheet({ position: "SIDE", item: null });

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card shadow-sm transition-colors",
        cooked ? "border-primary/40" : "border-border",
        variant === "full" ? "p-4" : "p-3"
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-secondary-foreground">
          <PeriodIcon className="size-3.5" />
          {label}
        </span>
        {cooked ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
            <CheckCircle2 className="size-4" />
            Đã nấu{variant === "full" && meal.cookedAt ? ` lúc ${cookedTime(meal.cookedAt)}` : ""}
          </span>
        ) : null}
      </div>

      <div className={cn("flex flex-col", variant === "full" ? "gap-3" : "gap-2")}>
        {main ? (
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                Món chính
              </p>
              <p
                className={cn(
                  "font-bold leading-snug",
                  variant === "full" ? "text-lg" : "text-[15px]"
                )}
              >
                {main.food.name}
              </p>
              {variant === "full" ? (
                <Badge
                  variant="outline"
                  className="mt-1 rounded-full text-[10.5px] font-medium text-muted-foreground"
                >
                  {main.food.cookingMethod}
                </Badge>
              ) : null}
            </div>
            {swapButton(main)}
          </div>
        ) : null}

        {side ? (
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Món phụ
              </p>
              <p
                className={cn(
                  "font-semibold leading-snug",
                  variant === "full" ? "text-base" : "text-sm"
                )}
              >
                {side.food.name}
              </p>
              {variant === "full" ? (
                <Badge
                  variant="outline"
                  className="mt-1 rounded-full text-[10.5px] font-medium text-muted-foreground"
                >
                  {side.food.cookingMethod}
                </Badge>
              ) : null}
            </div>
            {swapButton(side)}
          </div>
        ) : (
          <button
            type="button"
            onClick={openAddSide}
            className={cn(
              "flex items-center gap-1.5 rounded-xl border border-dashed border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              variant === "full"
                ? "px-3 py-2.5 text-sm font-medium"
                : "px-2.5 py-1.5 text-xs font-medium"
            )}
          >
            <Plus className={variant === "full" ? "size-4" : "size-3.5"} />
            Thêm món phụ
          </button>
        )}
      </div>

      {variant === "compact" && absentMembers.length > 0 ? (
        <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          <UserX className="size-3.5 shrink-0" />
          <span className="truncate">
            {absentMembers.map((m) => m.name).join(", ")} không ăn
          </span>
        </p>
      ) : null}

      {variant === "full" && members.length > 0 ? (
        <div className="mt-3">
          <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Ai ăn bữa này · {eatingCount}/{members.length}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {members.map((member) => {
              const absent = absentIds.has(member.id);
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => onToggleAbsence(member.id)}
                  aria-pressed={absent}
                  title={
                    absent
                      ? `${member.name} không ăn — bấm để ăn lại`
                      : `${member.name} sẽ ăn — bấm nếu không ăn`
                  }
                  className={cn(
                    "inline-flex h-8 items-center gap-1 rounded-full border px-3 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    absent
                      ? "border-dashed border-border bg-transparent text-muted-foreground/70 line-through"
                      : "border-transparent bg-secondary text-secondary-foreground"
                  )}
                >
                  {absent ? <UserX className="size-3.5" /> : null}
                  {member.name}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {variant === "full" && ingredients.length > 0 ? (
        <div className="mt-3">
          <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Cần chuẩn bị
          </p>
          <div className="flex flex-wrap gap-1.5">
            {ingredients.map((name) => (
              <span
                key={name}
                className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className={variant === "full" ? "mt-3" : "mt-2"}>
        {noteDraft !== null ? (
          <div>
            <Textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              maxLength={300}
              placeholder="Vd: thiếu nước mắm, nhớ mua thêm tiêu…"
              autoFocus
              className="min-h-14 bg-card text-sm"
            />
            <div className="mt-1.5 flex items-center gap-1.5">
              <Button
                size="sm"
                onClick={() => saveNote(noteDraft)}
                disabled={pending}
                className="h-7 px-3 text-xs font-semibold"
              >
                {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
                Lưu
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setNoteDraft(null)}
                disabled={pending}
                className="h-7 px-3 text-xs"
              >
                Hủy
              </Button>
              {meal.note ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => saveNote("")}
                  className="ml-auto rounded-md text-xs font-medium text-destructive/80 transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Xóa ghi chú
                </button>
              ) : null}
            </div>
          </div>
        ) : meal.note ? (
          <button
            type="button"
            onClick={() => setNoteDraft(meal.note ?? "")}
            title="Bấm để sửa ghi chú"
            className="flex w-full items-start gap-1.5 rounded-xl bg-amber-500/10 px-3 py-2 text-left transition-colors hover:bg-amber-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <StickyNote className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <span
              className={cn(
                "min-w-0 flex-1 whitespace-pre-wrap text-amber-800 dark:text-amber-200",
                variant === "full" ? "text-[13px]" : "text-xs"
              )}
            >
              {meal.note}
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setNoteDraft("")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md font-medium text-muted-foreground/80 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              variant === "full" ? "text-[13px]" : "text-xs"
            )}
          >
            <StickyNote className={variant === "full" ? "size-3.5" : "size-3"} />
            Thêm ghi chú
          </button>
        )}
      </div>

      {variant === "full" ? (
        <div className="mt-4">
          {!cooked ? (
            <Button
              onClick={onMarkCooked}
              disabled={pending}
              className="h-11 w-full text-base font-semibold"
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-5" />
              )}
              Đã nấu
            </Button>
          ) : (
            <Button
              onClick={onUndo}
              disabled={pending}
              variant="outline"
              className="h-9 w-full text-sm font-medium text-muted-foreground"
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Undo2 className="size-4" />
              )}
              Hoàn tác
            </Button>
          )}
        </div>
      ) : null}

      {sheet ? (
        <SwapSheet
          mealId={meal.id}
          position={sheet.position}
          item={sheet.item}
          foods={foods}
          open={sheet !== null}
          onOpenChange={(open) => {
            if (!open) setSheet(null);
          }}
        />
      ) : null}
    </div>
  );
}
