import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getMembers } from "@/lib/queries";
import { APP_NAME, APP_VERSION } from "@/lib/app-info";
import { PageHeader } from "@/components/page-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LogoutButton } from "@/components/logout-button";
import { MembersCard } from "@/components/members-card";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = { title: "Cài đặt" };

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/40 px-3 py-4 text-center">
      <p className="font-heading text-2xl font-bold tabular-nums leading-none">
        {value}
      </p>
      <p className="mt-2 text-[13px] leading-tight text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

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
  const displayName = session.name || "Admin";

  return (
    <div className="mx-auto w-full max-w-4xl">
      <PageHeader
        title="Cài đặt"
        description="Tài khoản, giao diện và những người cùng ăn trong nhà."
      />

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-5">
          <Card className="ring-primary/10">
            <CardContent className="flex items-center gap-3">
              <Avatar size="lg">
                <AvatarFallback className="bg-secondary font-semibold text-primary">
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{displayName}</p>
                <p className="truncate text-[13px] text-muted-foreground">
                  {session.email}
                </p>
              </div>
              <Badge variant="secondary">Đang đăng nhập</Badge>
            </CardContent>
          </Card>

          <MembersCard members={members} currentUserId={session.sub} />
        </div>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Giao diện</CardTitle>
              <CardDescription>
                Chọn sáng, tối, hoặc đi theo cài đặt của máy.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ThemeToggle />
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-primary/60">
            <CardHeader>
              <CardTitle>Nhà mình đã nấu tới đâu</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-2">
              <Stat value={String(foodCount)} label="món đã lưu" />
              <Stat value={String(totalCooked)} label="lượt đã nấu" />
              <Stat value={String(planCount)} label="tuần đã lên lịch" />
            </CardContent>
            <CardFooter className="border-t">
              <p className="text-[13px] text-muted-foreground">
                Phiên đăng nhập được lưu 90 ngày trên thiết bị này và tự gia hạn
                mỗi lần bạn mở app.
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>

      <div className="mt-4 flex flex-col items-center gap-4">
        <LogoutButton />
        <p className="text-[13px] text-muted-foreground">
          {APP_NAME} phiên bản {APP_VERSION}
        </p>
      </div>
    </div>
  );
}
