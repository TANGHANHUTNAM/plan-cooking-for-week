"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Copy,
  Info,
  ShoppingBasket,
  StickyNote,
} from "lucide-react";
import { toast } from "sonner";
import { aggregateIngredients, type ShoppingMeal } from "@/lib/shopping";
import {
  addDaysISO,
  DAY_LABELS,
  DAY_LABELS_SHORT,
  formatDM,
  weekdayIndex,
  weekDaysISO,
} from "@/lib/week";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { EmptyState } from "@/components/empty-state";
import { FoodTypeTile } from "@/components/food-type";
import { SectionHeading } from "@/components/page-header";

const WEEK_SCOPE = "WEEK";
/** Kiểu đi chợ buổi chiều của nhà: mua cho bữa tối nay + bữa trưa ngày mai */
const EVENING_SCOPE = "EVENING";

const PERIOD_LABEL = { LUNCH: "Trưa", DINNER: "Tối" } as const;
const PERIOD_ORDER = { LUNCH: 0, DINNER: 1 } as const;

export function ShoppingScreen({
  meals,
  weekStart,
  today,
  tomorrow,
  isCurrentWeek,
}: {
  meals: ShoppingMeal[];
  weekStart: string;
  today: string;
  tomorrow: string;
  isCurrentWeek: boolean;
}) {
  const days = weekDaysISO(weekStart);
  const weekEnd = addDaysISO(weekStart, 6);
  // nhà hay đi chợ buổi chiều -> mặc định gom "tối nay + trưa mai"
  const [scope, setScope] = useState<string>(() =>
    isCurrentWeek ? EVENING_SCOPE : WEEK_SCOPE
  );

  const storageKey = `pf-shop-${weekStart}`;
  const [checked, setChecked] = useState<string[]>([]);
  const activeChipRef = useRef<HTMLButtonElement | null>(null);

  // đưa chip đang chọn vào tầm nhìn trên mobile
  useEffect(() => {
    activeChipRef.current?.scrollIntoView({
      inline: "center",
      block: "nearest",
    });
  }, [scope]);

  useEffect(() => {
    // localStorage chỉ đọc được sau khi hydrate — bắt buộc sync qua effect
    let next: string[] = [];
    try {
      const raw = localStorage.getItem(storageKey);
      next = raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      next = [];
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChecked(next);
  }, [storageKey]);

  const isChecked = (name: string) => checked.includes(name.trim());

  const toggle = (name: string) => {
    const key = name.trim();
    setChecked((prev) => {
      const next = prev.includes(key)
        ? prev.filter((n) => n !== key)
        : [...prev, key];
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // localStorage bị chặn: chỉ mất trạng thái tick, không chặn thao tác
      }
      return next;
    });
  };

  if (meals.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingBasket />}
        title="Chưa có gì để mua"
        description="Tuần này chưa có thực đơn nên chưa gom được nguyên liệu nào."
      >
        <Button variant="outline" size="lg" asChild className="h-11 lg:h-10">
          <Link href="/week">
            <CalendarDays />
            Mở lịch tuần
          </Link>
        </Button>
      </EmptyState>
    );
  }

  const scopedMeals = (
    scope === EVENING_SCOPE
      ? meals.filter(
          (m) =>
            (m.dateISO === today && m.period === "DINNER") ||
            (m.dateISO === tomorrow && m.period === "LUNCH")
        )
      : scope === WEEK_SCOPE
        ? meals.filter((m) => m.dateISO >= weekStart && m.dateISO <= weekEnd)
        : meals.filter((m) => m.dateISO === scope)
  )
    .slice()
    .sort(
      (a, b) =>
        a.dateISO.localeCompare(b.dateISO) ||
        PERIOD_ORDER[a.period] - PERIOD_ORDER[b.period]
    );

  // "Tối nay" / "Trưa mai" / "Trưa Thứ 2"
  const mealTitle = (m: ShoppingMeal) => {
    const period = PERIOD_LABEL[m.period];
    if (m.dateISO === today) return `${period} nay`;
    if (m.dateISO === tomorrow) return `${period} mai`;
    return `${period} ${DAY_LABELS[weekdayIndex(m.dateISO)]}`;
  };

  const entries = aggregateIngredients(scopedMeals);
  const done = entries.filter((e) => checked.includes(e.name)).length;

  const scopeLabel =
    scope === EVENING_SCOPE
      ? "tối nay và trưa mai"
      : scope === WEEK_SCOPE
        ? "cả tuần"
        : scope === today
          ? "hôm nay"
          : `${DAY_LABELS_SHORT[days.indexOf(scope)]} ${formatDM(scope)}`;

  const missingTomorrowLunch =
    scope === EVENING_SCOPE &&
    !scopedMeals.some((m) => m.dateISO === tomorrow && m.period === "LUNCH");

  const shoppableMeals = scopedMeals
    .map((meal) => ({
      meal,
      dishes: meal.dishes.filter((d) => d.ingredients.length > 0),
    }))
    // bữa có ghi chú vẫn hiện dù món không có nguyên liệu — kẻo sót "thiếu gia vị"
    .filter((g) => g.dishes.length > 0 || g.meal.note);

  const onCopy = async () => {
    const lines: string[] = [`Đi chợ ${scopeLabel}:`];
    for (const { meal, dishes } of shoppableMeals) {
      lines.push("", `▸ ${mealTitle(meal)} (${formatDM(meal.dateISO)})`);
      if (meal.note) {
        lines.push(`⚠ Ghi chú: ${meal.note}`);
      }
      for (const dish of dishes) {
        lines.push(`- ${dish.name}: ${dish.ingredients.join(", ")}`);
      }
    }
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast.success(`Đã copy danh sách đi chợ ${scopeLabel}`);
    } catch {
      toast.error("Trình duyệt chặn clipboard nên chưa copy được");
    }
  };

  return (
    <>
      <div className="relative -mx-4 mb-4 sm:-mx-6 lg:mx-0">
        <div
          role="region"
          aria-label="Phạm vi đi chợ — vuốt ngang để xem thêm"
          className="no-scrollbar overflow-x-auto px-4 pr-10 sm:px-6 sm:pr-14 lg:px-0 lg:pr-0"
        >
          <ToggleGroup
            type="single"
            value={scope}
            onValueChange={(v) => v && setScope(v)}
            variant="outline"
            spacing={2}
            aria-label="Phạm vi đi chợ"
            className="h-11 w-max lg:h-9"
          >
            {isCurrentWeek ? (
              <ToggleGroupItem
                value={EVENING_SCOPE}
                ref={scope === EVENING_SCOPE ? activeChipRef : undefined}
                className="h-11 rounded-full px-4 text-xs font-medium data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground lg:h-9"
              >
                Tối nay và trưa mai
              </ToggleGroupItem>
            ) : null}
            <ToggleGroupItem
              value={WEEK_SCOPE}
              ref={scope === WEEK_SCOPE ? activeChipRef : undefined}
              className="h-11 rounded-full px-4 text-xs font-medium data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground lg:h-9"
            >
              Cả tuần
            </ToggleGroupItem>
            {days.map((day, i) => (
              <ToggleGroupItem
                key={day}
                value={day}
                ref={scope === day ? activeChipRef : undefined}
                className="h-11 rounded-full px-4 text-xs font-medium data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground lg:h-9"
              >
                {day === today ? "Hôm nay" : DAY_LABELS_SHORT[i]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background via-background/90 to-transparent lg:hidden"
        />
      </div>

      {shoppableMeals.length === 0 ? (
        <EmptyState
          icon={<ShoppingBasket />}
          title="Không có gì phải mua"
          description={
            scope === EVENING_SCOPE
              ? "Tối nay và trưa mai chưa có bữa nào trong thực đơn."
              : scopedMeals.length === 0
                ? "Ngày này chưa có bữa nào trong thực đơn."
                : "Các món trong phạm vi này không cần mua nguyên liệu."
          }
        />
      ) : (
        <div className="flex flex-col gap-5">
          {missingTomorrowLunch ? (
            <Alert>
              <Info />
              <AlertDescription>
                Trưa mai chưa có trong thực đơn vì tuần sau chưa được tạo. Danh
                sách này mới gồm đồ cho bữa tối nay.
              </AlertDescription>
            </Alert>
          ) : null}

          <Card size="sm">
            <CardContent className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
              <div className="w-full min-w-[12rem] sm:w-80">
                <p className="text-sm font-medium">
                  Đã mua{" "}
                  <span className="tabular-nums">
                    {done}/{entries.length}
                  </span>{" "}
                  nguyên liệu
                </p>
                <Progress
                  value={entries.length ? (done / entries.length) * 100 : 0}
                  aria-label={`Đã mua ${done} trên ${entries.length} nguyên liệu`}
                  className="mt-2 h-1.5"
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Danh sách cho {scopeLabel}
                </p>
              </div>
              <Button
                variant="outline"
                size="lg"
                onClick={onCopy}
                className="h-11 shrink-0 lg:h-9"
              >
                <Copy />
                Copy danh sách
              </Button>
            </CardContent>
          </Card>

          {shoppableMeals.map(({ meal, dishes }) => (
            <section key={`${meal.dateISO}-${meal.period}`}>
              <SectionHeading meta={formatDM(meal.dateISO)}>
                {mealTitle(meal)}
              </SectionHeading>

              {meal.note ? (
                <p className="mb-3 flex items-start gap-2 rounded-md bg-warm-surface px-3 py-2 text-[13px] text-warm-foreground">
                  <StickyNote className="mt-px size-3.5 shrink-0 text-warm" />
                  <span className="min-w-0 whitespace-pre-wrap">
                    {meal.note}
                  </span>
                </p>
              ) : null}

              <div className="grid auto-rows-fr items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {dishes.map((dish) => (
                  <Card
                    key={dish.name}
                    size="sm"
                    className="h-full gap-0 overflow-hidden py-0"
                  >
                    <p className="flex items-center gap-2 border-b bg-muted/50 px-3.5 py-2 text-[13px] font-semibold">
                      <FoodTypeTile
                        type={dish.position}
                        className="size-6"
                        iconClassName="size-3.5"
                      />
                      <span className="min-w-0 flex-1">{dish.name}</span>
                    </p>
                    <ul className="divide-y">
                      {dish.ingredients.map((name) => (
                        <li key={name}>
                          <Label className="flex min-h-11 cursor-pointer items-center gap-2.5 px-3.5 py-2.5 font-normal transition-colors hover:bg-muted/40 lg:min-h-10">
                            <Checkbox
                              checked={isChecked(name)}
                              onCheckedChange={() => toggle(name)}
                              className="size-[18px]"
                            />
                            <span
                              className={cn(
                                "min-w-0 flex-1 truncate text-sm font-medium transition-colors",
                                isChecked(name) &&
                                  "text-muted-foreground line-through"
                              )}
                            >
                              {name}
                            </span>
                          </Label>
                        </li>
                      ))}
                    </ul>
                  </Card>
                ))}
              </div>
            </section>
          ))}

          <p className="text-xs text-muted-foreground">
            Nguyên liệu dùng chung giữa các món chỉ cần tick một lần là gạch ở
            mọi chỗ. Các dấu tick lưu trên máy này, theo từng tuần.
          </p>
        </div>
      )}
    </>
  );
}
