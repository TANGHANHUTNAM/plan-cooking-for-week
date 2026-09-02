import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Tiêu đề trang: một dòng tên trang, một dòng mô tả ngắn, hành động bên phải.
 * Mô tả nói rõ trang này dùng để làm gì thay vì nhãn trang trí phía trên.
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
        "mb-5 flex flex-wrap items-start justify-between gap-x-4 gap-y-3 lg:mb-6",
        className
      )}
    >
      <div className="min-w-0 flex-1">
        <h1 className="font-heading truncate text-[1.625rem] font-bold leading-tight tracking-[-0.02em] lg:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
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

/** Tiêu đề của một khối trong trang — nhỏ hơn tiêu đề trang một bậc. */
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
    <div className={cn("mb-2.5 flex items-baseline gap-2", className)}>
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
