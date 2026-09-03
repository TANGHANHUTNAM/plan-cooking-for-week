import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChartColumn, CookingPot } from "lucide-react";
import { getSession } from "@/lib/session";
import { getAnalyticsData, getMembers } from "@/lib/queries";
import {
  absenceByMember,
  cookingHeatmap,
  methodDistribution,
  plannedMethodMix,
  ratingDistribution,
  staleFoods,
  summarize,
  topCookedFoods,
  topIngredients,
  weeklyProgress,
} from "@/lib/analytics";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import {
  CookingHeatmapGrid,
  RankBars,
  SplitBar,
  StaleFoodTable,
  StatTile,
} from "@/components/analytics-panels";
import {
  CountColumnChart,
  WeeklyProgressChart,
} from "@/components/analytics-charts";

export const metadata: Metadata = { title: "Thống kê" };

/** Every panel is one question with its answer, so the card titles read as questions. */
function Panel({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default async function AnalyticsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [{ foods, meals }, members] = await Promise.all([
    getAnalyticsData(),
    getMembers(),
  ]);

  const summary = summarize(foods, meals);
  const weeks = weeklyProgress(meals);
  const heatmap = cookingHeatmap(meals);
  const methods = methodDistribution(foods);
  const plannedMethods = plannedMethodMix(meals);
  const ratings = ratingDistribution(foods);
  const cooked = topCookedFoods(foods);
  const ingredients = topIngredients(foods);
  const absences = absenceByMember(meals, members);
  const stale = staleFoods(foods, new Date());

  if (foods.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <PageHeader
          title="Thống kê"
          description="Nhìn lại cả nhà đã nấu gì, món nào hay ra, nguyên liệu nào mua nhiều nhất."
        />
        <EmptyState
          icon={<CookingPot />}
          title="Chưa có dữ liệu để thống kê"
          description="Thêm vài món ở tab Món ăn rồi random một tuần, các biểu đồ sẽ hiện ngay ở đây."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[104rem]">
      <PageHeader
        title="Thống kê"
        description="Nhìn lại cả nhà đã nấu gì, món nào hay ra, nguyên liệu nào mua nhiều nhất."
      />

      <section aria-label="Số liệu tổng quan" className="mb-4">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          <StatTile
            value={String(summary.foods)}
            label="món đã lưu"
            hint={`${summary.mains} chính · ${summary.sides} phụ`}
          />
          <StatTile
            value={String(summary.plannedMeals)}
            label="bữa đã lên lịch"
            hint={`trong ${summary.weeks} tuần`}
          />
          <StatTile
            value={`${summary.cookedRate}%`}
            label="bữa đã nấu"
            hint={`${summary.cookedMeals}/${summary.plannedMeals} bữa`}
          />
          <StatTile
            value={String(summary.cookedTimes)}
            label="lượt nấu món"
            hint="tính cả món chính và phụ"
          />
          <StatTile
            value={String(summary.neverCooked)}
            label="món chưa nấu lần nào"
            hint={`trên ${summary.foods} món`}
          />
          <StatTile
            value={String(summary.distinctIngredients)}
            label="nguyên liệu khác nhau"
            hint="trong danh sách đi chợ"
          />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        <Panel
          title="Mỗi tuần nấu được bao nhiêu bữa?"
          description="Phần đậm là số bữa đã đánh dấu đã nấu, phần nhạt là bữa còn lại trong tuần đó."
        >
          {weeks.length > 0 ? (
            <WeeklyProgressChart data={weeks} />
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Chưa có tuần nào được lên lịch.
            </p>
          )}
        </Panel>

        <Panel
          title="Nhà mình hay nấu vào bữa nào?"
          description="Số bữa đã nấu theo từng ngày trong tuần, gộp tất cả các tuần đã lên lịch."
        >
          <CookingHeatmapGrid heatmap={heatmap} />
        </Panel>

        <Panel
          title="Kho món nghiêng về cách nấu nào?"
          description="Số món đã lưu theo cách chế biến — cột càng cao thì kho món càng nhiều kiểu đó."
        >
          <CountColumnChart data={methods} label="món" />
        </Panel>

        <Panel
          title="Thực đơn thật sự nấu kiểu gì?"
          description="Số lần mỗi cách chế biến xuất hiện trong các bữa đã lên lịch, để so với kho món bên trên."
        >
          <CountColumnChart data={plannedMethods} label="lần" />
        </Panel>

        <Panel
          title="Cả nhà chấm điểm các món ra sao?"
          description="Số món theo mức yêu thích. Món điểm cao được random ra nhiều hơn."
        >
          <CountColumnChart data={ratings} label="món" />
        </Panel>

        <Panel
          title="Tỉ lệ món chính và món phụ"
          description="Kho món cần đủ món phụ để bữa nào cũng ghép được canh hoặc rau."
        >
          <SplitBar
            parts={[
              {
                label: "Món chính",
                value: summary.mains,
                color: "var(--viz-fill)",
              },
              {
                label: "Món phụ",
                value: summary.sides,
                color: "var(--viz-alt)",
              },
            ]}
            emptyText="Chưa có món nào."
          />
        </Panel>

        <Panel
          title="Món nào được nấu nhiều nhất?"
          description="Số lần đã nấu, tính từ lúc bắt đầu đánh dấu đã nấu."
        >
          <RankBars
            rows={cooked}
            unit="lần"
            emptyText="Chưa có bữa nào được đánh dấu đã nấu."
          />
        </Panel>

        <Panel
          title="Nguyên liệu nào đi chợ nhiều nhất?"
          description="Số món dùng tới nguyên liệu đó — mua một lần là dùng được cho nhiều bữa."
        >
          <RankBars
            rows={ingredients}
            unit="món"
            emptyText="Các món chưa khai báo nguyên liệu."
          />
        </Panel>

        <Panel
          title="Ai vắng bữa nhiều nhất?"
          description="Số bữa được đánh dấu không ăn, tính trên tất cả các tuần."
        >
          <RankBars
            rows={absences}
            unit="bữa"
            emptyText="Chưa ai đánh dấu vắng bữa nào."
          />
        </Panel>

        <Panel
          title="Món nào lâu rồi chưa nấu?"
          description="Gợi ý cho tuần tới: món chưa nấu lần nào xếp trước, rồi tới món đợi lâu nhất."
          className="lg:col-span-2 2xl:col-span-1"
        >
          <StaleFoodTable rows={stale} />
        </Panel>
      </div>

      <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <ChartColumn className="size-3.5" />
        Số liệu tính trực tiếp từ dữ liệu của cả nhà, cập nhật ngay khi bạn đổi
        món hay đánh dấu đã nấu.
      </p>
    </div>
  );
}
