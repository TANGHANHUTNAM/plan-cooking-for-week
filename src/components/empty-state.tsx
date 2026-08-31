import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  children,
  className,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-6 py-10 text-center shadow-sm",
        className
      )}
    >
      <div className="grid size-14 place-items-center rounded-full bg-muted text-muted-foreground">
        {icon}
      </div>
      <div>
        <p className="font-semibold">{title}</p>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children ? (
        <div className="mt-2 flex flex-col gap-2">{children}</div>
      ) : null}
    </div>
  );
}
