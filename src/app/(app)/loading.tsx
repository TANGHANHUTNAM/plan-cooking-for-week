import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-4 pt-1" aria-busy="true">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3.5 w-24 rounded-full" />
        <Skeleton className="h-8 w-44 rounded-lg" />
      </div>
      <Skeleton className="h-44 rounded-2xl" />
      <Skeleton className="h-44 rounded-2xl" />
      <Skeleton className="h-24 rounded-2xl" />
    </div>
  );
}
