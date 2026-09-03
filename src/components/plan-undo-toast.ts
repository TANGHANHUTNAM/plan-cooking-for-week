"use client";

import { toast } from "sonner";
import { restorePlanSnapshot } from "@/actions/plans";

/** Shared wording for a restore result — also used by the history sheet. */
export function restoredMessage(meals = 0, skipped = 0): string {
  const base = `Đã khôi phục thực đơn (${meals} bữa)`;
  return skipped > 0 ? `${base} — bỏ ${skipped} món đã xóa` : base;
}

async function undoPlanWrite(snapshotId: string): Promise<void> {
  const pending = toast.loading("Đang khôi phục thực đơn cũ…");
  try {
    const res = await restorePlanSnapshot(snapshotId);
    if (res.error) toast.error(res.error, { id: pending });
    else {
      toast.success(restoredMessage(res.restoredMeals, res.skippedDishes), {
        id: pending,
      });
    }
  } catch {
    toast.error("Không khôi phục được — kiểm tra mạng rồi thử lại nhé", {
      id: pending,
    });
  }
}

/**
 * Success toast for a write that replaced the whole week. The snapshot taken right before
 * it is offered as "Hoàn tác" — the first line of defence against a mis-tapped "Random tuần".
 * Without a snapshot (the week was empty) there is nothing to undo.
 */
export function toastPlanReplaced(message: string, snapshotId?: string): void {
  if (!snapshotId) {
    toast.success(message);
    return;
  }
  toast.success(message, {
    duration: 12000, // long enough to notice the mistake and tap undo
    action: {
      label: "Hoàn tác",
      onClick: () => void undoPlanWrite(snapshotId),
    },
  });
}
