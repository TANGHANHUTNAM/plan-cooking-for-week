"use client";

import { useEffect, useState, useTransition } from "react";
import { ChevronDown, History, RotateCcw, StickyNote } from "lucide-react";
import { toast } from "sonner";
import {
  loadPlanHistory,
  restorePlanSnapshot,
  type PlanSnapshotDTO,
} from "@/actions/plans";
import {
  formatSnapshotTime,
  snapshotReasonLabel,
  type SnapshotDay,
  type SnapshotMeal,
} from "@/lib/plan-history";
import { DAY_LABELS_SHORT, formatDM, weekdayIndex } from "@/lib/week";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { PeriodChip } from "@/components/meal-card";
import { ResponsiveSheet } from "@/components/responsive-sheet";
import { restoredMessage } from "@/components/plan-undo-toast";

/** Main dish first, then side dishes — the same reading order as the calendar. */
function dishLine(meal: SnapshotMeal): string {
  const main = meal.dishes.filter((d) => d.position === "MAIN");
  const sides = meal.dishes.filter((d) => d.position === "SIDE");
  const names = [...main, ...sides].map((d) => d.name);
  return names.length > 0 ? names.join(" · ") : "Chưa có món";
}

function MealLine({ meal }: { meal: SnapshotMeal }) {
  return (
    <div className="flex items-start gap-2">
      <PeriodChip period={meal.period} />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-snug">{dishLine(meal)}</p>
        {meal.note ? (
          <p className="mt-0.5 flex items-start gap-1 text-[11px] text-amber-700 dark:text-amber-300">
            <StickyNote className="mt-0.5 size-3 shrink-0" />
            <span className="min-w-0 break-words">{meal.note}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}

function DayBlock({ day }: { day: SnapshotDay }) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/30 p-2.5">
      <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground">
        {DAY_LABELS_SHORT[weekdayIndex(day.dateISO)]} {formatDM(day.dateISO)}
      </p>
      <div className="flex flex-col gap-1.5">
        {day.meals.map((meal) => (
          <MealLine key={`${meal.dateISO}-${meal.period}`} meal={meal} />
        ))}
      </div>
    </div>
  );
}

function SnapshotCard({
  snapshot,
  disabled,
  onRestore,
}: {
  snapshot: PlanSnapshotDTO;
  disabled: boolean;
  onRestore: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <li className="rounded-xl border border-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <span className="text-sm font-semibold tabular-nums">
          {formatSnapshotTime(snapshot.createdAtISO)}
        </span>
        <Badge variant="secondary">
          {snapshotReasonLabel(snapshot.reason)}
        </Badge>
        <span className="text-xs tabular-nums text-muted-foreground">
          {snapshot.mealCount} bữa
        </span>
        <Button
          variant="outline"
          size="lg"
          className="ms-auto h-9"
          disabled={disabled}
          onClick={onRestore}
        >
          <RotateCcw />
          Khôi phục
        </Button>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="mt-1 h-8 px-2 text-xs text-muted-foreground"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        <ChevronDown
          className={cn("transition-transform", expanded && "rotate-180")}
        />
        {expanded ? "Ẩn thực đơn" : "Xem thực đơn đã lưu"}
      </Button>

      {expanded ? (
        <div className="mt-2 flex flex-col gap-2">
          {snapshot.days.map((day) => (
            <DayBlock key={day.dateISO} day={day} />
          ))}
        </div>
      ) : null}
    </li>
  );
}

/**
 * History of one week: every random/copy/restore stores the menu it replaced,
 * so a mis-tapped "Random tuần" can be rolled back with every day intact.
 */
export function PlanHistorySheet({
  weekStart,
  open,
  onOpenChange,
}: {
  weekStart: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [snapshots, setSnapshots] = useState<PlanSnapshotDTO[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<PlanSnapshotDTO | null>(
    null
  );
  const [pending, startTransition] = useTransition();

  // The sheet mounts only when the history button is pressed, so load on demand.
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const load = async () => {
      try {
        const res = await loadPlanHistory(weekStart);
        if (cancelled) return;
        if (res.error) {
          setLoadError(res.error);
          setSnapshots([]);
          return;
        }
        setLoadError(null);
        setSnapshots(res.snapshots ?? []);
      } catch {
        if (cancelled) return;
        setLoadError("Không tải được lịch sử — kiểm tra mạng rồi thử lại nhé");
        setSnapshots([]);
      }
    };
    void load();

    return () => {
      cancelled = true;
    };
  }, [open, weekStart]);

  const runRestore = (snapshotId: string) =>
    startTransition(async () => {
      const res = await restorePlanSnapshot(snapshotId);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(restoredMessage(res.restoredMeals, res.skippedDishes));
      setConfirmTarget(null);
      onOpenChange(false);
    });

  return (
    <>
      <ResponsiveSheet
        open={open}
        onOpenChange={onOpenChange}
        icon={<History className="size-4" />}
        title="Lịch sử thực đơn"
        description="Mỗi lần random hoặc copy cả tuần, thực đơn cũ được lưu lại đây để khôi phục."
      >
        {snapshots === null ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
        ) : snapshots.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {loadError ??
              "Tuần này chưa có bản lưu nào. Thực đơn hiện tại sẽ được lưu lại ngay trước lần random hoặc copy kế tiếp."}
          </p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {snapshots.map((snapshot) => (
              <SnapshotCard
                key={snapshot.id}
                snapshot={snapshot}
                disabled={pending}
                onRestore={() => setConfirmTarget(snapshot)}
              />
            ))}
          </ul>
        )}
      </ResponsiveSheet>

      <AlertDialog
        open={confirmTarget !== null}
        onOpenChange={(value) => {
          if (!value) setConfirmTarget(null);
        }}
      >
        <AlertDialogContent className="max-w-[calc(100vw_-_2rem)] sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Khôi phục thực đơn này?</AlertDialogTitle>
            <AlertDialogDescription>
              Thực đơn tuần này sẽ được thay bằng bản lưu lúc{" "}
              {confirmTarget
                ? formatSnapshotTime(confirmTarget.createdAtISO)
                : ""}
              . Bản hiện tại vẫn được lưu vào lịch sử.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={(event) => {
                event.preventDefault(); // keep the dialog open until the restore finishes
                if (confirmTarget) runRestore(confirmTarget.id);
              }}
            >
              {pending ? <Spinner /> : null}
              Khôi phục
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
