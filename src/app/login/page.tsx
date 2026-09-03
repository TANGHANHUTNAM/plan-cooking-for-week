import type { Metadata } from "next";
import { CookingPot } from "lucide-react";
import { APP_NAME, APP_TAGLINE } from "@/lib/app-info";
import { Card, CardContent } from "@/components/ui/card";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = { title: "Đăng nhập" };

export default function LoginPage() {
  return (
    <main className="relative flex min-h-dvh flex-col justify-center overflow-hidden bg-background px-5 py-12">
      {/* A soft green glow behind the logo — the page's only accent. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 size-[34rem] -translate-x-1/2 -translate-y-[65%] rounded-full bg-[radial-gradient(circle,var(--primary),transparent_65%)] opacity-[0.10]"
      />

      <div className="relative mx-auto w-full max-w-sm">
        <div className="mb-7 flex flex-col items-center gap-4 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground ring-4 ring-primary/10">
            <CookingPot className="size-7" strokeWidth={2.2} />
          </span>
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-[-0.02em]">
              {APP_NAME}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{APP_TAGLINE}</p>
          </div>
        </div>

        <Card className="[--card-spacing:--spacing(6)] ring-primary/10">
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          Phiên đăng nhập giữ 90 ngày trên thiết bị này.
        </p>
      </div>
    </main>
  );
}
