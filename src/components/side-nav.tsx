"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CookingPot } from "lucide-react";
import { APP_NAME, APP_TAGLINE, APP_VERSION } from "@/lib/app-info";
import { APP_TABS, isTabActive } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

/** Desktop navigation sidebar (lg and up) — replaces the bottom nav. */
export function SideNav() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-dvh w-[17rem] shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-5 py-8 lg:flex">
      <Link
        href="/"
        className="group flex items-center gap-3 rounded-xl px-2 py-2 outline-none transition-colors hover:bg-sidebar-accent/50 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground transition-colors group-hover:bg-sidebar-primary/90">
          <CookingPot className="size-[18px]" strokeWidth={2.2} />
        </span>
        <span className="min-w-0 leading-tight">
          <span className="font-heading block truncate text-[15px] font-bold tracking-[-0.01em] text-sidebar-foreground">
            {APP_NAME}
          </span>
          <span className="mt-0.5 block truncate text-[13px] text-sidebar-foreground/60">
            {APP_TAGLINE}
          </span>
        </span>
      </Link>

      <Separator className="my-7" />

      <nav
        aria-label="Điều hướng chính"
        className="flex flex-1 flex-col gap-1.5"
      >
        {APP_TABS.map(({ href, label, icon: Icon }) => {
          const active = isTabActive(href, pathname);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex min-h-12 items-center gap-3 rounded-xl px-2.5 py-2.5 text-[15px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                  : "font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-md transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "bg-sidebar-foreground/5 text-sidebar-foreground/60 group-hover:bg-sidebar-accent group-hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon
                  className="size-[17px]"
                  strokeWidth={active ? 2.3 : 1.9}
                />
              </span>
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 border-t border-sidebar-border px-2 pt-4">
        <p className="text-xs font-medium tracking-[0.01em] text-sidebar-foreground/60">
          Phiên bản{" "}
          <span className="tabular-nums text-sidebar-foreground/80">
            {APP_VERSION}
          </span>
        </p>
      </div>
    </aside>
  );
}
