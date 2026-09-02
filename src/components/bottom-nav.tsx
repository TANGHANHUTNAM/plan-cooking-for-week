"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { APP_TABS, isTabActive } from "@/lib/nav";
import { cn } from "@/lib/utils";

/** Bottom nav cho điện thoại/tablet — desktop (lg+) dùng SideNav. */
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
      className="relative z-40 shrink-0 border-t border-border bg-card/85 backdrop-blur-lg lg:hidden"
    >
      <div className="mx-auto grid w-full max-w-lg grid-cols-5 gap-1 px-2 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1.5">
        {APP_TABS.map(({ href, label, icon: Icon }) => {
          const active = isTabActive(href, pathname);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className="group flex flex-col items-center gap-1 rounded-lg py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span
                className={cn(
                  "grid h-7 w-14 place-items-center rounded-full transition-colors",
                  active
                    ? "bg-secondary text-primary"
                    : "text-muted-foreground group-hover:text-foreground"
                )}
              >
                <Icon className="size-5" strokeWidth={active ? 2.3 : 1.9} />
              </span>
              <span
                className={cn(
                  "truncate text-[11px] leading-none",
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
