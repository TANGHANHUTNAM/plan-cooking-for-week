// Server-rendered pieces of the Thống kê page. Long Vietnamese dish names never fit a
// chart library's category axis on a phone, so the rankings, the heatmap and the
// part-to-whole bar are plain CSS: they reflow to any width and ship no JavaScript.

import type { CookingHeatmap, Slice, StaleFood } from "@/lib/analytics";
import { DAY_LABELS_SHORT } from "@/lib/week";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { FoodTypeIcon } from "@/components/food-type";

/** A headline number with its label — the right form when the data is one value. */
export function StatTile({
  value,
  label,
  hint,
}: {
  value: string;
  label: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/40 px-3 py-3.5">
      <p className="font-heading text-2xl font-bold leading-none">{value}</p>
      <p className="mt-1.5 text-xs font-medium leading-tight">{label}</p>
      {hint ? (
        <p className="mt-1 text-[11px] leading-tight text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Horizontal ranking. The name sits above its own bar so it is never truncated,
 * and the value is labelled at the tip — no tooltip needed to read the chart.
 */
export function RankBars({
  rows,
  unit,
  emptyText,
}: {
  rows: Slice[];
  /** Unit for the value at the bar tip, e.g. "lần" or "món". */
  unit: string;
  emptyText: string;
}) {
  const max = rows.reduce((top, row) => Math.max(top, row.value), 0);
  if (rows.length === 0 || max === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        {emptyText}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
              {row.label}
            </span>
            <span className="shrink-0 text-[13px] font-semibold tabular-nums">
              {row.value}
              <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                {unit}
              </span>
            </span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(4, (row.value / max) * 100)}%`,
                backgroundColor: "var(--viz-fill)",
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Five steps of one hue: more cooked meals in a slot means a darker cell. */
function heatStyle(cooked: number, max: number) {
  if (cooked === 0) return { backgroundColor: "var(--viz-heat-0)" };
  const step = Math.min(5, Math.max(1, Math.ceil((cooked / max) * 5)));
  return { backgroundColor: `var(--viz-heat-${step})` };
}

/**
 * Cooked meals per weekday × meal, laid out like the weekly calendar.
 * Each cell carries its own number, so the colour is a second reading of the value
 * rather than the only one.
 */
export function CookingHeatmapGrid({ heatmap }: { heatmap: CookingHeatmap }) {
  const rows = [
    { period: "LUNCH" as const, label: "Trưa" },
    { period: "DINNER" as const, label: "Tối" },
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-[2.25rem_repeat(7,minmax(0,1fr))] gap-1">
        <span aria-hidden />
        {DAY_LABELS_SHORT.map((day) => (
          <span
            key={day}
            className="text-center text-[11px] font-semibold text-muted-foreground"
          >
            {day}
          </span>
        ))}

        {rows.map((row) => (
          <div
            key={row.period}
            className="col-span-full grid grid-cols-subgrid"
          >
            <span className="self-center text-[11px] font-semibold text-muted-foreground">
              {row.label}
            </span>
            {heatmap.cells
              .filter((cell) => cell.period === row.period)
              .map((cell) => (
                <span
                  key={`${row.period}-${cell.dayIndex}`}
                  title={`${DAY_LABELS_SHORT[cell.dayIndex]} ${row.label}: đã nấu ${cell.cooked}/${cell.planned} bữa`}
                  className={cn(
                    "grid h-9 place-items-center rounded-md text-xs font-semibold tabular-nums sm:h-10",
                    cell.cooked > heatmap.max / 2
                      ? "text-white dark:text-black/80"
                      : "text-foreground/70"
                  )}
                  style={heatStyle(cell.cooked, heatmap.max)}
                >
                  {cell.cooked}
                </span>
              ))}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span>Ít</span>
        {[0, 1, 2, 3, 4, 5].map((step) => (
          <span
            key={step}
            className="size-3.5 rounded-sm"
            style={{ backgroundColor: `var(--viz-heat-${step})` }}
          />
        ))}
        <span>Nhiều</span>
      </div>
    </div>
  );
}

/** Part-to-whole for two classes: one bar, a 2px surface gap, both parts labelled. */
export function SplitBar({
  parts,
  emptyText,
}: {
  parts: { label: string; value: number; color: string }[];
  emptyText: string;
}) {
  const total = parts.reduce((sum, part) => sum + part.value, 0);
  if (total === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        {emptyText}
      </p>
    );
  }

  return (
    <div>
      <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full">
        {parts
          .filter((part) => part.value > 0)
          .map((part) => (
            <span
              key={part.label}
              className="h-full first:rounded-l-full last:rounded-r-full"
              style={{
                width: `${(part.value / total) * 100}%`,
                backgroundColor: part.color,
              }}
            />
          ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
        {parts.map((part) => (
          <li key={part.label} className="flex items-center gap-2">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: part.color }}
              aria-hidden
            />
            <span className="text-[13px]">
              {part.label}
              <span className="ml-1.5 font-semibold tabular-nums">
                {part.value}
              </span>
              <span className="ml-1 text-[11px] text-muted-foreground">
                ({Math.round((part.value / total) * 100)}%)
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Dishes waiting the longest — a table, because the rows are names, not magnitudes. */
export function StaleFoodTable({ rows }: { rows: StaleFood[] }) {
  if (rows.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Chưa có món nào để gợi ý — thêm món ở tab Món ăn nhé.
      </p>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-border/70">
      {rows.map((row) => (
        <li
          key={row.name}
          className="flex items-center gap-2.5 py-2 first:pt-0"
        >
          <FoodTypeIcon type={row.type} className="size-3.5 shrink-0" />
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
            {row.name}
          </span>
          <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
            {row.favoriteScore}★
          </span>
          {row.days === null ? (
            <Badge variant="secondary">Chưa nấu</Badge>
          ) : (
            <Badge variant="outline">{row.days} ngày</Badge>
          )}
        </li>
      ))}
    </ul>
  );
}
