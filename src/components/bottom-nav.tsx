"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { APP_TABS, isTabActive } from "@/lib/nav";
import { cn } from "@/lib/utils";

/** Bottom navigation for mobile/tablet — desktop (lg+) uses the SideNav. */
export function BottomNav() {
  const pathname = usePathname();

  useEffect(() => {
    document.getElementById("app-main")?.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
  }, [pathname]);

  return (
    <nav
      aria-label="Điều hướng chính"
      className="relative z-40 shrink-0 border-t border-border bg-card/95 backdrop-blur-lg lg:hidden"
    >
      {/* six tabs: the pill grows with its column instead of a fixed width, so the
          labels still fit on a 320px phone */}
      <div className="mx-auto grid w-full max-w-lg grid-cols-6 gap-0.5 px-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        {APP_TABS.map(({ href, label, icon: Icon }) => {
          const active = isTabActive(href, pathname);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className="group flex min-h-11 min-w-0 flex-col items-center gap-1 rounded-xl py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span
                className={cn(
                  "relative grid h-8 w-full max-w-14 place-items-center rounded-full transition-colors",
                  active
                    ? "bg-secondary text-primary"
                    : "text-muted-foreground group-hover:text-foreground"
                )}
              >
                <Icon className="size-5" strokeWidth={active ? 2.3 : 1.9} />
              </span>
              <span
                className={cn(
                  // six labels only fit at 10px on a 320px phone; they grow back
                  // toward the 13px the design uses as soon as there is room
                  "w-full truncate text-center text-[10px] leading-none min-[360px]:text-[11px] min-[400px]:text-xs",
                  active
                    ? "font-semibold text-foreground"
                    : "font-medium text-muted-foreground"
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
