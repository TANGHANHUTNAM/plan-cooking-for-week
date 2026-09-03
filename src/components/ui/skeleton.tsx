import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "motion-safe:animate-pulse rounded-md bg-muted/70 ring-1 ring-inset ring-border/60",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
