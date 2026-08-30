import type { Metadata } from "next";
import { CookingPot } from "lucide-react";
import { APP_NAME, APP_TAGLINE } from "@/lib/app-info";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = { title: "Đăng nhập" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 pb-16">
      <div className="md:rounded-3xl md:border md:border-border md:bg-card md:p-10 md:shadow-sm">
      <div className="mb-8 flex flex-col items-center gap-4 text-center">
        <div className="grid size-16 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
          <CookingPot className="size-8" strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{APP_NAME}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{APP_TAGLINE}</p>
        </div>
      </div>

      <LoginForm />

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Phiên đăng nhập được lưu 90 ngày trên thiết bị này.
      </p>
      </div>
    </main>
  );
}
