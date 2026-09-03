"use client";

import { useOptimistic, useState, useTransition } from "react";
import {
  ArrowLeftRight,
  CheckCircle2,
  Circle,
  MoonStar,
  Plus,
  ShoppingBasket,
  StickyNote,
  Sun,
  Undo2,
  Users,
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
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FoodTypeIcon } from "@/components/food-type";
import { SwapSheet } from "@/components/swap-sheet";

/** Lunch uses amber, dinner uses indigo — the color makes the meal obvious at a glance. */
const PERIOD_META = {
  LUNCH: {
    label: "Trưa",
    icon: Sun,
    chip: "bg-warm-surface text-warm-foreground",
  },
  DINNER: {
    label: "Tối",
    icon: MoonStar,
    chip: "bg-cool-surface text-cool-foreground",
  },
} as const;

export function PeriodChip({
  period,
  size = "compact",
}: {
  period: "LUNCH" | "DINNER";
  size?: "full" | "compact";
}) {
  const { label, icon: Icon, chip } = PERIOD_META[period];
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full font-semibold",
        "border border-current/10",
        chip,
        size === "full" ? "px-2.5 py-1 text-[13px]" : "px-2 py-0.5 text-[11px]"
      )}
    >
      <Icon
        className={size === "full" ? "size-3.5" : "size-3"}
        strokeWidth={2.4}
      />
      {label}
    </span>
  );
}

function cookedTime(iso: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: APP_TZ,
  }).format(new Date(iso));
}

/** One food position in a meal. It always occupies one row, even when empty —
 *  this keeps meal cards the same height instead of collapsing when the side dish is missing. */
function DishRow({
  role,
  name,
  method,
  size,
  onSwap,
}: {
  role: "MAIN" | "SIDE";
  name: string;
  method: string;
  size: "full" | "compact";
  onSwap: () => void;
}) {
  const isMain = role === "MAIN";
  return (
    <div className="flex items-start gap-2.5">
      <FoodTypeIcon
        type={role}
        className={size === "full" ? "mt-1 size-4" : "mt-0.5 size-3.5"}
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "leading-snug",
            isMain ? "font-semibold" : "font-medium",
            size === "full"
              ? isMain
                ? "text-[17px]"
                : "text-[15px]"
              : // weekly calendar: use the same text size and always reserve two lines, so main and
                // side dishes for every day align on one row
                "min-h-[2lh] text-sm"
          )}
        >
          {name}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {method}
        </p>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size={size === "full" ? "icon" : "icon-sm"}
            aria-label={`Đổi ${isMain ? "món chính" : "món phụ"}`}
            onClick={onSwap}
            className={cn(
              "-mr-1 size-11 shrink-0 text-muted-foreground hover:text-foreground",
              size === "full" ? "lg:size-7" : "lg:size-6"
            )}
          >
            <ArrowLeftRight />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Đổi món khác</TooltipContent>
      </Tooltip>
    </div>
  );
}

/** Empty slot keeps the height of one food row so meals stay aligned. */
function EmptyDishRow({
  role,
  size,
  onAdd,
}: {
  role: "MAIN" | "SIDE";
  size: "full" | "compact";
  onAdd: () => void;
}) {
  const box = cn(
    "flex w-full items-center gap-2.5 rounded-md border border-dashed border-border text-left text-muted-foreground",
    size === "full" ? "px-3 py-2.5" : "px-2.5 py-2"
  );
  const text = cn("font-medium", size === "full" ? "text-sm" : "text-xs");

  return (
    <button
      type="button"
      onClick={onAdd}
      className={cn(
        box,
        "min-h-11 outline-none transition-colors hover:border-primary/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring lg:min-h-0"
      )}
    >
      <Plus className={size === "full" ? "size-4" : "size-3.5"} />
      <span className={text}>
        {role === "MAIN" ? "Thêm món chính" : "Thêm món phụ"}
      </span>
    </button>
  );
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
  const [noteDraft, setNoteDraft] = useState<string | null>(null); // null = no edit
  const [pending, startTransition] = useTransition();

  // attendance toggles immediately in the UI; the server confirms afterward
  const [absentIds, toggleAbsentOptimistic] = useOptimistic(
    new Set(meal.absentUserIds),
    (state: ReadonlySet<string>, userId: string) => {
      const next = new Set(state);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    }
  );

  const isFull = variant === "full";
  const { label } = PERIOD_META[meal.period];
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
      else toast.success(`Đã ghi nhận bữa ${label.toLowerCase()}`);
    });

  const onUndo = () =>
    startTransition(async () => {
      const res = await undoCooked(meal.id);
      if (res.error) toast.error(res.error);
      else toast.success("Đã bỏ đánh dấu đã nấu");
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

  const openSwap = (position: "MAIN" | "SIDE", item: MealItemDTO | null) =>
    setSheet({ position, item });

  const periodChip = (
    <PeriodChip period={meal.period} size={isFull ? "full" : "compact"} />
  );

  const dishes = (
    <>
      {main ? (
        <DishRow
          role="MAIN"
          name={main.food.name}
          method={main.food.cookingMethod}
          size={variant}
          onSwap={() => openSwap("MAIN", main)}
        />
      ) : (
        <EmptyDishRow
          role="MAIN"
          size={variant}
          onAdd={() => openSwap("MAIN", null)}
        />
      )}
      <Separator />
      {side ? (
        <DishRow
          role="SIDE"
          name={side.food.name}
          method={side.food.cookingMethod}
          size={variant}
          onSwap={() => openSwap("SIDE", side)}
        />
      ) : (
        <EmptyDishRow
          role="SIDE"
          size={variant}
          onAdd={() => openSwap("SIDE", null)}
        />
      )}
    </>
  );

  const noteBlock =
    noteDraft !== null ? (
      <div>
        <Textarea
          value={noteDraft}
          onChange={(e) => setNoteDraft(e.target.value)}
          maxLength={300}
          placeholder="Ví dụ: nhà hết nước mắm, mua thêm tiêu"
          autoFocus
          className="min-h-16 text-sm"
        />
        <div className="mt-2 flex items-center gap-2">
          <Button
            size="lg"
            onClick={() => saveNote(noteDraft)}
            disabled={pending}
            className="h-11 lg:h-8"
          >
            {pending ? <Spinner /> : null}
            Lưu ghi chú
          </Button>
          <Button
            size="lg"
            variant="ghost"
            onClick={() => setNoteDraft(null)}
            disabled={pending}
            className="h-11 lg:h-8"
          >
            Hủy
          </Button>
          {meal.note ? (
            <Button
              size="lg"
              variant="ghost"
              disabled={pending}
              onClick={() => saveNote("")}
              className="ml-auto h-11 text-destructive hover:text-destructive lg:h-8"
            >
              Xóa
            </Button>
          ) : null}
        </div>
      </div>
    ) : meal.note ? (
      <button
        type="button"
        onClick={() => setNoteDraft(meal.note ?? "")}
        className="flex min-h-11 w-full items-start gap-2 rounded-md bg-warm-surface px-3 py-2 text-left outline-none transition-opacity hover:opacity-85 focus-visible:ring-2 focus-visible:ring-ring lg:min-h-0"
      >
        <StickyNote className="mt-px size-3.5 shrink-0 text-warm" />
        <span
          className={cn(
            "min-w-0 flex-1 whitespace-pre-wrap text-warm-foreground",
            isFull ? "text-[13px]" : "text-xs"
          )}
        >
          {meal.note}
        </span>
      </button>
    ) : isFull ? (
      <button
        type="button"
        onClick={() => setNoteDraft("")}
        className="-mx-2 inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 py-2 text-[13px] font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring lg:mx-0 lg:min-h-0 lg:px-0 lg:py-0"
      >
        <StickyNote className="size-3.5" />
        Thêm ghi chú cho bữa này
      </button>
    ) : null;

  const swapSheet = sheet ? (
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
  ) : null;

  if (!isFull) {
    return (
      <div
        className={cn(
          "flex flex-col gap-2.5 rounded-xl p-3 ring-1 ring-inset ring-current/10",
          meal.period === "LUNCH" ? "bg-warm-surface/60" : "bg-cool-surface/60"
        )}
      >
        <div className="flex items-center justify-between gap-2">
          {periodChip}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={pending}
                onClick={cooked ? onUndo : onMarkCooked}
                aria-pressed={cooked}
                aria-label={cooked ? "Bỏ đánh dấu đã nấu" : "Đánh dấu đã nấu"}
                className={cn(
                  "-mr-1 size-11 shrink-0 hover:bg-card lg:size-6",
                  cooked ? "text-primary" : "text-muted-foreground/60"
                )}
              >
                {pending ? <Spinner /> : cooked ? <CheckCircle2 /> : <Circle />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {cooked ? "Bỏ đánh dấu đã nấu" : "Đánh dấu đã nấu"}
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="flex flex-col gap-2.5">{dishes}</div>

        {absentMembers.length > 0 ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="size-3.5 shrink-0" />
            <span className="truncate">
              Vắng {absentMembers.map((m) => m.name).join(", ")}
            </span>
          </p>
        ) : null}

        {noteBlock}
        {swapSheet}
      </div>
    );
  }

  return (
    <Card
      className={cn(
        "h-full border-l-4",
        meal.period === "LUNCH" ? "border-l-warm/70" : "border-l-cool/70"
      )}
    >
      <CardHeader className="border-b">
        {periodChip}
        <CardAction>
          {cooked ? (
            <Badge variant="secondary" className="gap-1 text-primary">
              <CheckCircle2 />
              {meal.cookedAt ? `Đã nấu ${cookedTime(meal.cookedAt)}` : "Đã nấu"}
            </Badge>
          ) : null}
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="flex flex-col gap-3">{dishes}</div>

        {members.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="mr-0.5 inline-flex items-center gap-1.5 text-xs tabular-nums text-muted-foreground">
                  <Users className="size-3.5" />
                  {eatingCount}/{members.length}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                Số người ăn bữa này — bấm tên để đổi
              </TooltipContent>
            </Tooltip>
            {members.map((member) => {
              const absent = absentIds.has(member.id);
              return (
                <Toggle
                  key={member.id}
                  size="sm"
                  pressed={!absent}
                  onPressedChange={() => onToggleAbsence(member.id)}
                  aria-label={
                    absent
                      ? `${member.name} không ăn bữa này, bấm để ăn lại`
                      : `${member.name} có ăn bữa này, bấm nếu vắng`
                  }
                  className={cn(
                    "h-11 rounded-full px-3 text-xs font-medium lg:h-7",
                    absent
                      ? "border border-dashed border-border text-muted-foreground/70 line-through"
                      : "bg-secondary text-secondary-foreground data-[state=on]:bg-secondary data-[state=on]:text-secondary-foreground"
                  )}
                >
                  {member.name}
                </Toggle>
              );
            })}
          </div>
        ) : null}

        {ingredients.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="mr-0.5 text-muted-foreground">
                  <ShoppingBasket className="size-3.5" />
                  <span className="sr-only">Nguyên liệu cần mua</span>
                </span>
              </TooltipTrigger>
              <TooltipContent>Nguyên liệu cần mua</TooltipContent>
            </Tooltip>
            {ingredients.map((name) => (
              <Badge key={name} variant="outline" className="font-normal">
                {name}
              </Badge>
            ))}
          </div>
        ) : null}

        {noteBlock}
      </CardContent>

      <CardFooter className="mt-auto border-t">
        {cooked ? (
          <Button
            onClick={onUndo}
            disabled={pending}
            variant="outline"
            size="lg"
            className="h-11 w-full text-sm text-muted-foreground lg:h-10"
          >
            {pending ? <Spinner /> : <Undo2 />}
            Bỏ đánh dấu đã nấu
          </Button>
        ) : (
          <Button
            onClick={onMarkCooked}
            disabled={pending}
            size="lg"
            className="h-11 w-full text-sm font-semibold"
          >
            {pending ? <Spinner /> : <CheckCircle2 />}
            Đã nấu bữa này
          </Button>
        )}
      </CardFooter>

      {swapSheet}
    </Card>
  );
}
