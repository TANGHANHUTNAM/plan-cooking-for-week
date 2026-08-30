"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CookingPot } from "lucide-react";
import { APP_NAME, APP_TAGLINE, APP_VERSION } from "@/lib/app-info";
import { APP_TABS, isTabActive } from "@/lib/nav";
import { cn } from "@/lib/utils";

/** Sidebar điều hướng cho desktop (lg trở lên) — thay cho bottom nav. */
export function SideNav() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-card px-4 py-6 lg:flex">
      <Link
        href="/"
        className="flex items-center gap-2.5 rounded-xl px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
          <CookingPot className="size-5" strokeWidth={2.2} />
        </span>
        <span className="min-w-0 leading-tight">
          <span className="block truncate font-bold">{APP_NAME}</span>
          <span className="block text-[11px] text-muted-foreground">
            {APP_TAGLINE}
          </span>
        </span>
      </Link>

      <nav aria-label="Điều hướng chính" className="mt-8 flex flex-1 flex-col gap-1">
        {APP_TABS.map(({ href, label, icon: Icon }) => {
          const active = isTabActive(href, pathname);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-secondary font-semibold text-primary"
                  : "font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="size-5" strokeWidth={active ? 2.4 : 2} />
              {label}
            </Link>
          );
        })}
      </nav>

      <p className="px-3 text-[11px] text-muted-foreground">
        v{APP_VERSION} · dữ liệu trên Supabase
      </p>
    </aside>
  );
}
