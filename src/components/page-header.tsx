import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Page title: one line for the name, one short description, and actions on the right.
 * The description explains the page's purpose instead of acting as a decorative label.
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "mb-7 flex flex-wrap items-start justify-between gap-x-5 gap-y-4 border-b border-border/70 pb-6 lg:mb-9 lg:pb-7",
        className
      )}
    >
      <div className="min-w-0 flex-1">
        <h1 className="font-heading truncate text-[1.625rem] font-bold leading-tight tracking-[-0.02em] lg:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-prose text-sm/6 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}

/** Section heading — one step smaller than the page title. */
export function SectionHeading({
  children,
  meta,
  className,
}: {
  children: ReactNode;
  meta?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex items-baseline gap-2", className)}>
      <h2 className="font-heading text-base font-semibold tracking-[-0.01em]">
        {children}
      </h2>
      {meta ? (
        <span className="text-xs tabular-nums text-muted-foreground">
          {meta}
        </span>
      ) : null}
    </div>
  );
}
