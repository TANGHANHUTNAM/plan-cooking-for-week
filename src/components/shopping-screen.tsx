"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import Link from "next/link";
import {
  CalendarDays,
  Copy,
  Info,
  Plus,
  ShoppingBasket,
  StickyNote,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  addShoppingExtra,
  deleteShoppingExtra,
  setShoppingExtraPurchased,
  setShoppingIngredientChecked,
} from "@/actions/shopping";
import {
  aggregateIngredients,
  normalizeIngredientKey,
  type ShoppingExtra,
  type ShoppingMeal,
} from "@/lib/shopping";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { EmptyState } from "@/components/empty-state";
import { FoodTypeTile } from "@/components/food-type";
import { SectionHeading } from "@/components/page-header";

const WEEK_SCOPE = "WEEK";
/** The household's afternoon shopping view: buy for tonight's dinner + tomorrow's lunch */
const EVENING_SCOPE = "EVENING";

const PERIOD_LABEL = { LUNCH: "Trưa", DINNER: "Tối" } as const;
const PERIOD_ORDER = { LUNCH: 0, DINNER: 1 } as const;

export function ShoppingScreen({
  meals,
  weekStart,
  today,
  tomorrow,
  isCurrentWeek,
  checkedIngredientKeys,
  extras: initialExtras,
}: {
  meals: ShoppingMeal[];
  weekStart: string;
  today: string;
  tomorrow: string;
  isCurrentWeek: boolean;
  checkedIngredientKeys: string[];
  extras: ShoppingExtra[];
}) {
  const days = weekDaysISO(weekStart);
  const weekEnd = addDaysISO(weekStart, 6);
  // the household usually shops in the afternoon -> default to "tonight + tomorrow lunch"
  const [scope, setScope] = useState<string>(() =>
    isCurrentWeek ? EVENING_SCOPE : WEEK_SCOPE
  );
  const [checked, setChecked] = useState<Set<string>>(
    () => new Set(checkedIngredientKeys)
  );
  const [extraItems, setExtraItems] = useState<ShoppingExtra[]>(initialExtras);
  const [extraDraft, setExtraDraft] = useState("");
  const [extraDate, setExtraDate] = useState(isCurrentWeek ? today : days[0]);
  const [pending, startTransition] = useTransition();
  const activeChipRef = useRef<HTMLButtonElement | null>(null);

  // bring the selected chip into view on mobile
  useEffect(() => {
    activeChipRef.current?.scrollIntoView({
      inline: "center",
      block: "nearest",
    });
  }, [scope]);

  // changing the scope also changes the default date for "Add item"
  const onScopeChange = (nextScope: string) => {
    if (!nextScope) return;
    setScope(nextScope);
    const nextDates = datesForScope(nextScope);
    if (!nextDates.includes(extraDate)) setExtraDate(nextDates[0]);
  };

  const datesForScope = (value: string): string[] =>
    value === EVENING_SCOPE
      ? [today, tomorrow]
      : value === WEEK_SCOPE
        ? days
        : [value];

  const visibleDates = datesForScope(scope);

  const dateLabel = (dateISO: string) => {
    if (dateISO === today) return "Hôm nay";
    if (dateISO === tomorrow) return "Ngày mai";
    const dayIndex = days.indexOf(dateISO);
    return dayIndex >= 0
      ? DAY_LABELS_SHORT[dayIndex]
      : DAY_LABELS[weekdayIndex(dateISO)];
  };

  const extraDateLabel = (dateISO: string) =>
    `${dateLabel(dateISO)} · ${formatDM(dateISO)}`;

  const visibleExtras = extraItems.filter((extra) =>
    visibleDates.includes(extra.dateISO)
  );

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

  // "Tonight" / "Tomorrow lunch" / "Monday lunch"
  const mealTitle = (m: ShoppingMeal) => {
    const period = PERIOD_LABEL[m.period];
    if (m.dateISO === today) return `${period} nay`;
    if (m.dateISO === tomorrow) return `${period} mai`;
    return `${period} ${DAY_LABELS[weekdayIndex(m.dateISO)]}`;
  };

  const entries = aggregateIngredients(scopedMeals);
  const done = entries.filter((entry) =>
    checked.has(normalizeIngredientKey(entry.name))
  ).length;

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
    // meals with notes remain visible even without ingredients — do not miss "missing seasoning"
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
    if (visibleExtras.length > 0) {
      lines.push("", "Mua thêm:");
      for (const dateISO of visibleDates) {
        const extras = visibleExtras.filter(
          (extra) => extra.dateISO === dateISO
        );
        if (extras.length === 0) continue;
        lines.push("", `▸ ${extraDateLabel(dateISO)}`);
        for (const extra of extras) {
          lines.push(`- ${extra.name}${extra.purchased ? " (đã mua)" : ""}`);
        }
      }
    }
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast.success(`Đã copy danh sách đi chợ ${scopeLabel}`);
    } catch {
      toast.error("Trình duyệt chặn clipboard nên chưa copy được");
    }
  };

  const toggleIngredient = (name: string) => {
    const key = normalizeIngredientKey(name);
    if (!key || pending) return;
    const nextChecked = !checked.has(key);
    setChecked((previous) => {
      const next = new Set(previous);
      if (nextChecked) next.add(key);
      else next.delete(key);
      return next;
    });

    startTransition(async () => {
      try {
        const result = await setShoppingIngredientChecked(
          weekStart,
          name,
          nextChecked
        );
        if (result.error) {
          setChecked((previous) => {
            const next = new Set(previous);
            if (nextChecked) next.delete(key);
            else next.add(key);
            return next;
          });
          toast.error(result.error);
        }
      } catch {
        setChecked((previous) => {
          const next = new Set(previous);
          if (nextChecked) next.delete(key);
          else next.add(key);
          return next;
        });
        toast.error("Không lưu được trạng thái — thử lại nhé");
      }
    });
  };

  const submitExtra = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    const name = extraDraft.trim();
    const dateISO = visibleDates.includes(extraDate)
      ? extraDate
      : visibleDates[0];
    if (!name || !dateISO) {
      toast.error("Nhập tên món mua thêm");
      return;
    }

    startTransition(async () => {
      try {
        const result = await addShoppingExtra(dateISO, name);
        if (result.error) {
          toast.error(result.error);
        } else if (result.extra) {
          setExtraItems((previous) => [...previous, result.extra!]);
          setExtraDraft("");
          toast.success("Đã thêm vào danh sách mua thêm");
        }
      } catch {
        toast.error("Không thêm được — thử lại nhé");
      }
    });
  };

  const toggleExtra = (extra: ShoppingExtra) => {
    if (pending) return;
    const purchased = !extra.purchased;
    setExtraItems((previous) =>
      previous.map((item) =>
        item.id === extra.id ? { ...item, purchased } : item
      )
    );

    startTransition(async () => {
      try {
        const result = await setShoppingExtraPurchased(extra.id, purchased);
        if (result.error) {
          setExtraItems((previous) =>
            previous.map((item) =>
              item.id === extra.id
                ? { ...item, purchased: extra.purchased }
                : item
            )
          );
          toast.error(result.error);
        }
      } catch {
        setExtraItems((previous) =>
          previous.map((item) =>
            item.id === extra.id
              ? { ...item, purchased: extra.purchased }
              : item
          )
        );
        toast.error("Không cập nhật được — thử lại nhé");
      }
    });
  };

  const removeExtra = (extra: ShoppingExtra) => {
    if (pending) return;
    const removedAt = extraItems.findIndex((item) => item.id === extra.id);
    setExtraItems((previous) =>
      previous.filter((item) => item.id !== extra.id)
    );

    const restore = () =>
      setExtraItems((previous) => {
        if (previous.some((item) => item.id === extra.id)) return previous;
        const next = [...previous];
        next.splice(Math.max(0, Math.min(removedAt, next.length)), 0, extra);
        return next;
      });

    startTransition(async () => {
      try {
        const result = await deleteShoppingExtra(extra.id);
        if (result.error) {
          restore();
          toast.error(result.error);
        } else {
          toast.success(`Đã xóa “${extra.name}”`);
        }
      } catch {
        restore();
        toast.error("Không xóa được — thử lại nhé");
      }
    });
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
            onValueChange={onScopeChange}
            variant="outline"
            spacing={2}
            aria-label="Phạm vi đi chợ"
            disabled={pending}
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
      </div>

      {meals.length === 0 ? (
        <EmptyState
          icon={<ShoppingBasket />}
          title="Chưa có gì để mua"
          description="Tuần này chưa có thực đơn nên chưa gom được nguyên liệu nào. Bạn vẫn có thể thêm đồ mua riêng bên dưới."
        >
          <Button variant="outline" size="lg" asChild className="h-11 lg:h-10">
            <Link href="/week">
              <CalendarDays />
              Mở lịch tuần
            </Link>
          </Button>
        </EmptyState>
      ) : shoppableMeals.length === 0 ? (
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

          <Card size="sm" className="border-l-4 border-l-primary/60">
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
                disabled={pending}
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
                <p className="mb-3 flex items-start gap-2 rounded-md bg-warm-surface px-3 py-2 text-sm text-warm-foreground">
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
                    className={cn(
                      "h-full gap-0 overflow-hidden border-l-2 py-0",
                      meal.period === "LUNCH"
                        ? "border-l-warm/70"
                        : "border-l-cool/70"
                    )}
                  >
                    <p className="flex items-center gap-2 border-b bg-muted/50 px-3.5 py-2 text-sm font-semibold">
                      <FoodTypeTile
                        type={dish.position}
                        className="size-6"
                        iconClassName="size-3.5"
                      />
                      <span className="min-w-0 flex-1">{dish.name}</span>
                    </p>
                    <ul className="divide-y">
                      {dish.ingredients.map((name) => {
                        const ingredientChecked = checked.has(
                          normalizeIngredientKey(name)
                        );
                        return (
                          <li key={name}>
                            <Label
                              className={cn(
                                "flex min-h-11 cursor-pointer items-center gap-2.5 px-3.5 py-2.5 font-normal transition-colors hover:bg-muted/40 lg:min-h-10",
                                pending && "cursor-not-allowed opacity-70"
                              )}
                            >
                              <Checkbox
                                checked={ingredientChecked}
                                disabled={pending}
                                onCheckedChange={() => toggleIngredient(name)}
                                className="size-[18px]"
                              />
                              <span
                                className={cn(
                                  "min-w-0 flex-1 truncate text-sm font-medium transition-colors",
                                  ingredientChecked &&
                                    "text-muted-foreground line-through"
                                )}
                              >
                                {name}
                              </span>
                            </Label>
                          </li>
                        );
                      })}
                    </ul>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <Card size="sm" className="mt-5">
        <CardHeader className="gap-1.5 border-b">
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="size-4 text-primary" />
            Mua thêm
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Thêm gia vị, hoa quả hoặc đồ dùng không nằm trong thực đơn. Danh
            sách này được dùng chung trong nhà.
          </p>
        </CardHeader>
        <CardContent className="pt-3">
          <form
            onSubmit={submitExtra}
            className="flex flex-col gap-2.5 sm:flex-row sm:items-end"
          >
            <div className="min-w-0 flex-1">
              <Label htmlFor="extra-name" className="mb-1.5 text-xs">
                Tên đồ mua thêm
              </Label>
              <Input
                id="extra-name"
                value={extraDraft}
                onChange={(event) => setExtraDraft(event.target.value)}
                placeholder="Ví dụ: Chuối, nước mắm..."
                maxLength={100}
                disabled={pending}
                className="h-11 text-sm lg:h-9"
              />
            </div>
            <div className="flex gap-2 sm:shrink-0">
              <div className="min-w-0 flex-1 sm:w-40 sm:flex-none">
                <Label htmlFor="extra-date" className="mb-1.5 text-xs">
                  Ngày mua
                </Label>
                <Select
                  value={extraDate}
                  onValueChange={setExtraDate}
                  disabled={pending}
                >
                  <SelectTrigger
                    id="extra-date"
                    size="lg"
                    className="h-11 w-full text-[13px] lg:h-9"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {visibleDates.map((dateISO) => (
                      <SelectItem key={dateISO} value={dateISO}>
                        {extraDateLabel(dateISO)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="submit"
                size="lg"
                disabled={pending}
                className="mt-[1.375rem] h-11 shrink-0 lg:h-9"
              >
                {pending ? <Spinner /> : <Plus />}
                Thêm
              </Button>
            </div>
          </form>

          {visibleExtras.length === 0 ? (
            <p className="mt-4 rounded-md border border-dashed px-3 py-3 text-xs text-muted-foreground">
              Chưa có món mua thêm trong phạm vi này.
            </p>
          ) : (
            <div className="mt-4 flex flex-col gap-4">
              {visibleDates.map((dateISO) => {
                const dateExtras = visibleExtras.filter(
                  (extra) => extra.dateISO === dateISO
                );
                if (dateExtras.length === 0) return null;
                return (
                  <div key={dateISO}>
                    <div className="mb-1.5 flex items-baseline gap-2">
                      <h3 className="text-xs font-semibold">
                        {dateLabel(dateISO)}
                      </h3>
                      <span className="text-[11px] tabular-nums text-muted-foreground">
                        {formatDM(dateISO)}
                      </span>
                    </div>
                    <ul className="divide-y rounded-md border">
                      {dateExtras.map((extra) => (
                        <li
                          key={extra.id}
                          className="flex min-h-11 items-center gap-2 px-3 py-1.5"
                        >
                          <Label
                            className={cn(
                              "min-w-0 flex-1 gap-2.5 font-normal",
                              pending && "cursor-not-allowed opacity-70"
                            )}
                          >
                            <Checkbox
                              checked={extra.purchased}
                              disabled={pending}
                              onCheckedChange={() => toggleExtra(extra)}
                              className="size-[18px]"
                              aria-label={`${extra.purchased ? "Bỏ đánh dấu" : "Đánh dấu"} đã mua ${extra.name}`}
                            />
                            <span
                              className={cn(
                                "min-w-0 flex-1 truncate text-sm font-medium",
                                extra.purchased &&
                                  "text-muted-foreground line-through"
                              )}
                            >
                              {extra.name}
                            </span>
                          </Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Xóa ${extra.name}`}
                            title={`Xóa ${extra.name}`}
                            onClick={() => removeExtra(extra)}
                            disabled={pending}
                            className="size-11 lg:size-9"
                          >
                            <Trash2 />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {meals.length > 0 ? (
        <p className="mt-4 text-xs text-muted-foreground">
          Nguyên liệu dùng chung giữa các món chỉ cần tick một lần là gạch ở mọi
          chỗ. Các dấu tick được lưu chung trong nhà, theo từng tuần.
        </p>
      ) : null}
    </>
  );
}
