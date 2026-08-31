import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getMembers } from "@/lib/queries";
import { APP_NAME, APP_VERSION } from "@/lib/app-info";
import { PageHeader } from "@/components/page-header";
import { Separator } from "@/components/ui/separator";
import { LogoutButton } from "@/components/logout-button";
import { MembersCard } from "@/components/members-card";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = { title: "Cài đặt" };

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [foodCount, cookedAgg, planCount, members] = await Promise.all([
    prisma.food.count(),
    prisma.foodStatistic.aggregate({ _sum: { totalCooked: true } }),
    prisma.mealPlan.count(),
    getMembers(),
  ]);
  const totalCooked = cookedAgg._sum.totalCooked ?? 0;

  const initial = (session.name || session.email).charAt(0).toUpperCase();

  return (
    <div className="w-full lg:max-w-md">
      <PageHeader eyebrow="Tài khoản" title="Cài đặt" />

      <div className="mb-4 flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="grid size-12 shrink-0 place-items-center rounded-full bg-secondary text-lg font-bold text-primary">
          {initial}
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold">{session.name || "Admin"}</p>
          <p className="truncate text-sm text-muted-foreground">
            {session.email}
          </p>
        </div>
      </div>

      <div className="mb-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold">Giao diện</p>
        <ThemeToggle />
      </div>

      <MembersCard members={members} currentUserId={session.sub} />

      <div className="mb-4 rounded-2xl border border-border bg-card px-4 shadow-sm">
        {[
          ["Món đã lưu", `${foodCount} món`],
          ["Tổng lượt đã nấu", `${totalCooked} lần`],
          ["Tuần đã lên lịch", `${planCount} tuần`],
          ["Phiên đăng nhập", "Lưu 90 ngày, tự gia hạn"],
        ].map(([label, value], i, arr) => (
          <div key={label}>
            <div className="flex items-center justify-between gap-3 py-3.5">
              <span className="text-sm text-muted-foreground">{label}</span>
              <span className="text-sm font-semibold tabular-nums">
                {value}
              </span>
            </div>
            {i < arr.length - 1 ? <Separator /> : null}
          </div>
        ))}
      </div>

      <LogoutButton />

      <p className="mt-6 text-center text-xs text-muted-foreground">
        {APP_NAME} v{APP_VERSION} · Next.js 16 + Prisma + Supabase
      </p>
    </div>
  );
}
