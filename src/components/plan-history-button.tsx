"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { History } from "lucide-react";
import { Button } from "@/components/ui/button";

// The sheet is only needed once history is opened — keep it out of the calendar bundle.
const LazyPlanHistorySheet = dynamic(
  () =>
    import("@/components/plan-history-sheet").then(
      (module) => module.PlanHistorySheet
    ),
  { loading: () => null }
);

/** Opens the saved versions of this week's plan (see PlanHistorySheet). */
export function PlanHistoryButton({
  weekStart,
  className,
}: {
  weekStart: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="lg"
        className={className}
        onClick={() => setOpen(true)}
      >
        <History />
        Lịch sử
      </Button>

      {open ? (
        <LazyPlanHistorySheet
          weekStart={weekStart}
          open={open}
          onOpenChange={setOpen}
        />
      ) : null}
    </>
  );
}
