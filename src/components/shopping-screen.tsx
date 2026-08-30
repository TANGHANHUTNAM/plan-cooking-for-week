"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CalendarDays, Copy, Info, ShoppingBasket } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/empty-state";

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
        icon={<ShoppingBasket className="size-7" />}
        title="Chưa có gì để mua"
        description="Tuần này chưa có thực đơn nên chưa gom được nguyên liệu."
        className="md:max-w-xl"
      >
        <Button asChild variant="outline">
          <Link href="/week">
            <CalendarDays className="size-4" />
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

  // "Tối nay · 30/08" / "Trưa mai · 31/08" / "Trưa Thứ 2 · 24/08"
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
      ? "tối nay + trưa mai"
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
    .filter((g) => g.dishes.length > 0);

  const onCopy = async () => {
    const lines: string[] = [`Đi chợ ${scopeLabel}:`];
    for (const { meal, dishes } of shoppableMeals) {
      lines.push("", `▸ ${mealTitle(meal)} (${formatDM(meal.dateISO)})`);
      for (const dish of dishes) {
        lines.push(`- ${dish.name}: ${dish.ingredients.join(", ")}`);
      }
    }
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast.success(`Đã copy danh sách ${scopeLabel}`);
    } catch {
      toast.error("Không copy được — trình duyệt chặn clipboard");
    }
  };

  return (
    <>
      <div className="-mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0 md:pb-0">
        {isCurrentWeek ? (
          <ScopeChip
            active={scope === EVENING_SCOPE}
            onClick={() => setScope(EVENING_SCOPE)}
            chipRef={scope === EVENING_SCOPE ? activeChipRef : undefined}
          >
            Tối nay + trưa mai
          </ScopeChip>
        ) : null}
        <ScopeChip
          active={scope === WEEK_SCOPE}
          onClick={() => setScope(WEEK_SCOPE)}
          chipRef={scope === WEEK_SCOPE ? activeChipRef : undefined}
        >
          Cả tuần
        </ScopeChip>
        {days.map((day, i) => (
          <ScopeChip
            key={day}
            active={scope === day}
            onClick={() => setScope(day)}
            chipRef={scope === day ? activeChipRef : undefined}
          >
            {day === today ? "Hôm nay" : DAY_LABELS_SHORT[i]}
          </ScopeChip>
        ))}
      </div>

      {shoppableMeals.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground md:max-w-xl">
          {scope === EVENING_SCOPE
            ? "Tối nay và trưa mai chưa có bữa nào trong thực đơn."
            : scopedMeals.length === 0
              ? "Ngày này chưa có bữa nào trong thực đơn."
              : "Các món trong phạm vi này không có nguyên liệu cần mua."}
        </p>
      ) : (
        <>
          {missingTomorrowLunch ? (
            <p className="mb-3 flex items-start gap-1.5 rounded-xl bg-secondary/60 px-3 py-2 text-xs text-secondary-foreground md:max-w-xl">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              Trưa mai chưa có trong thực đơn (tuần sau chưa tạo) — danh sách này
              mới gồm đồ cho bữa tối nay.
            </p>
          ) : null}

          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1 md:max-w-sm">
              <p className="mb-1.5 text-sm font-semibold tabular-nums">
                Đã mua {done}/{entries.length}
                <span className="ml-1.5 font-normal text-muted-foreground">
                  · {scopeLabel}
                </span>
              </p>
              <div
                role="progressbar"
                aria-valuenow={done}
                aria-valuemin={0}
                aria-valuemax={entries.length}
                className="h-1.5 overflow-hidden rounded-full bg-muted"
              >
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-300"
                  style={{ width: `${(done / entries.length) * 100}%` }}
                />
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={onCopy} className="shrink-0">
              <Copy className="size-3.5" />
              Copy
            </Button>
          </div>

          <div className="flex flex-col gap-5">
            {shoppableMeals.map(({ meal, dishes }) => (
              <section key={`${meal.dateISO}-${meal.period}`}>
                <h3 className="mb-2 flex items-baseline gap-2">
                  <span className="font-bold">{mealTitle(meal)}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {formatDM(meal.dateISO)}
                  </span>
                </h3>
                <div className="grid gap-3 md:grid-cols-2 md:items-start">
                  {dishes.map((dish) => (
                    <div
                      key={dish.name}
                      className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
                    >
                      <p className="border-b border-border bg-muted/50 px-3.5 py-2 text-[13px] font-semibold">
                        {dish.name}
                      </p>
                      <div className="divide-y divide-border">
                        {dish.ingredients.map((name) => (
                          <label
                            key={name}
                            className="flex cursor-pointer items-center gap-2.5 px-3.5 py-2 transition-colors hover:bg-muted/40"
                          >
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
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground md:text-left">
            Nguyên liệu dùng chung giữa các món: tick một lần là gạch ở mọi chỗ.
            Tick lưu trên máy này theo tuần.
          </p>
        </>
      )}
    </>
  );
}

function ScopeChip({
  active,
  onClick,
  children,
  chipRef,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  chipRef?: React.Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={chipRef}
      type="button"
      onClick={onClick}
      className={cn(
        "h-8 shrink-0 rounded-full border px-3.5 text-[13px] font-semibold transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
