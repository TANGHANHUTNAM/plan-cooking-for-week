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
    <aside className="sticky top-0 hidden h-dvh w-[16.5rem] shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-3 py-6 lg:flex">
      <Link
        href="/"
        className="mx-1 flex items-center gap-3 rounded-xl px-1 py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
          <CookingPot className="size-5" strokeWidth={2.2} />
        </span>
        <span className="min-w-0 leading-tight">
          <span className="font-heading block truncate text-[15px] font-bold tracking-[-0.01em]">
            {APP_NAME}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {APP_TAGLINE}
          </span>
        </span>
      </Link>

      <Separator className="my-5" />

      <nav aria-label="Điều hướng chính" className="flex flex-1 flex-col gap-1">
        {APP_TABS.map(({ href, label, icon: Icon }) => {
          const active = isTabActive(href, pathname);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-secondary font-semibold text-secondary-foreground"
                  : "font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {/* Left active marker: shows the current tab without changing text size */}
              <span
                aria-hidden
                className={cn(
                  "absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-primary transition-opacity",
                  active ? "opacity-100" : "opacity-0"
                )}
              />
              <Icon
                className={cn("size-[18px]", active && "text-primary")}
                strokeWidth={active ? 2.3 : 1.9}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      <p className="px-3 text-xs text-muted-foreground">
        Phiên bản {APP_VERSION}
      </p>
    </aside>
  );
}
