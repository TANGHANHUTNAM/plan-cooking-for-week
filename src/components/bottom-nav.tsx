"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_TABS, isTabActive } from "@/lib/nav";
import { cn } from "@/lib/utils";

/** Bottom nav cho điện thoại/tablet — desktop (lg+) dùng SideNav. */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Điều hướng chính"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85 lg:hidden"
    >
      <div className="mx-auto grid w-full max-w-md grid-cols-5 px-2 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1.5">
        {APP_TABS.map(({ href, label, icon: Icon }) => {
          const active = isTabActive(href, pathname);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className="group flex flex-col items-center gap-0.5 rounded-lg py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span
                className={cn(
                  "grid h-7 w-12 place-items-center rounded-full transition-colors",
                  active
                    ? "bg-secondary text-primary"
                    : "text-muted-foreground group-hover:text-foreground"
                )}
              >
                <Icon className="size-[21px]" strokeWidth={active ? 2.4 : 2} />
              </span>
              <span
                className={cn(
                  "text-[10.5px] font-medium leading-none",
                  active ? "text-primary" : "text-muted-foreground"
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
