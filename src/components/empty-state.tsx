import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

/**
 * Trạng thái rỗng dựng trên <Empty> của shadcn, bọc trong Card để có mặt phẳng
 * giống mọi khối khác. `description` luôn nói bước tiếp theo, không chỉ báo trống.
 */
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
    <Card className={cn("border-0 py-0", className)}>
      <Empty className="px-6 py-14">
        <EmptyHeader className="max-w-md">
          <EmptyMedia
            variant="icon"
            className="size-14 rounded-2xl bg-secondary text-primary [&_svg:not([class*='size-'])]:size-6"
          >
            {icon}
          </EmptyMedia>
          <EmptyTitle className="text-base">{title}</EmptyTitle>
          {description ? (
            <EmptyDescription className="text-sm">
              {description}
            </EmptyDescription>
          ) : null}
        </EmptyHeader>
        {children ? (
          <EmptyContent className="mt-1 max-w-md gap-2 sm:flex-row sm:justify-center">
            {children}
          </EmptyContent>
        ) : null}
      </Empty>
    </Card>
  );
}
