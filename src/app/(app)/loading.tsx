import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-5xl" aria-busy="true">
      <div className="mb-6 flex flex-col gap-2">
        <Skeleton className="h-8 w-52 rounded-md" />
        <Skeleton className="h-4 w-72 rounded-md" />
      </div>
      <Skeleton className="mb-4 h-[4.5rem] rounded-lg" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-72 rounded-lg" />
        <Skeleton className="h-72 rounded-lg" />
      </div>
    </div>
  );
}
