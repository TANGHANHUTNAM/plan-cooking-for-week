"use client";

import { Bar, BarChart, CartesianGrid, LabelList, XAxis } from "recharts";
import type { Slice, WeekProgress } from "@/lib/analytics";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

/** Bars stay thin and keep the band's leftover as air, per the data-viz mark spec. */
const BAR_SIZE = 22;
const RADIUS = 4;

const weekConfig = {
  cooked: { label: "Đã nấu", color: "var(--viz-fill)" },
  remaining: { label: "Chưa nấu", color: "var(--viz-track)" },
} satisfies ChartConfig;

/**
 * Cooked vs still-planned meals per week. The two segments are one hue in two steps
 * because they add up to the same total — the reader compares the filled part, not
 * two separate things.
 */
export function WeeklyProgressChart({ data }: { data: WeekProgress[] }) {
  return (
    <ChartContainer
      config={weekConfig}
      className="aspect-auto h-56 w-full sm:h-64"
    >
      <BarChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="" />
        <XAxis
          dataKey="shortLabel"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          interval="preserveStartEnd"
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) =>
                payload?.[0]?.payload?.label ?? ""
              }
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar
          dataKey="cooked"
          stackId="week"
          fill="var(--color-cooked)"
          maxBarSize={BAR_SIZE}
        />
        <Bar
          dataKey="remaining"
          stackId="week"
          fill="var(--color-remaining)"
          maxBarSize={BAR_SIZE}
          radius={[RADIUS, RADIUS, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  );
}

/**
 * One-series column chart for short labels (cooking methods, star buckets).
 * Values ride the caps so the chart needs no y-axis and every number is readable
 * without hovering.
 */
export function CountColumnChart({
  data,
  label,
  className,
}: {
  data: Slice[];
  /** What one bar counts, e.g. "món" — shown in the tooltip. */
  label: string;
  className?: string;
}) {
  const config = {
    value: { label, color: "var(--viz-fill)" },
  } satisfies ChartConfig;

  // seven Vietnamese method names in a 300px card collide at the default 12px
  const tickFontSize = data.length > 6 ? 10 : 12;

  return (
    <ChartContainer
      config={config}
      className={className ?? "aspect-auto h-52 w-full sm:h-60"}
    >
      <BarChart data={data} margin={{ top: 20, right: 4, left: 4, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          interval={0}
          tick={{ fontSize: tickFontSize }}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar
          dataKey="value"
          fill="var(--color-value)"
          maxBarSize={BAR_SIZE}
          radius={[RADIUS, RADIUS, 0, 0]}
        >
          <LabelList
            dataKey="value"
            position="top"
            offset={8}
            className="fill-muted-foreground"
            fontSize={11}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
