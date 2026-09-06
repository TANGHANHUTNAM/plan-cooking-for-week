"use client";

import { useState, useTransition } from "react";
import { StarOff } from "lucide-react";
import { toast } from "sonner";
import { resetAllFavorites } from "@/actions/foods";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
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

/**
 * Clear the rating of every dish in one go. The action cannot be undone and it shifts what
 * randomization favors, so it always asks first — and the label collapses to an icon on
 * mobile to keep the page header from crowding.
 */
export function ResetRatingsButton({ ratedCount }: { ratedCount: number }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const run = () =>
    startTransition(async () => {
      const res = await resetAllFavorites();
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(
        res.resetCount
          ? `Đã xóa đánh giá của ${res.resetCount} món`
          : "Không có món nào đang được đánh giá"
      );
      setConfirmOpen(false);
    });

  return (
    <>
      <Button
        variant="outline"
        size="lg"
        disabled={pending}
        onClick={() => setConfirmOpen(true)}
        aria-label="Xóa hết đánh giá"
        className="h-11 lg:h-10"
      >
        {pending ? <Spinner /> : <StarOff />}
        <span className="hidden sm:inline">Xóa hết đánh giá</span>
      </Button>

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!open && pending) return; // keep it open while the reset is running
          setConfirmOpen(open);
        }}
      >
        <AlertDialogContent className="max-w-[calc(100vw_-_2rem)] sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa hết đánh giá?</AlertDialogTitle>
            <AlertDialogDescription>
              {ratedCount} món sẽ về 0 sao. Thực đơn random sẽ không còn ưu tiên
              món nào cho tới khi bạn đánh giá lại, và thao tác này không khôi
              phục được.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault(); // keep the dialog open until the reset finishes
                run();
              }}
              disabled={pending}
              variant="destructive"
            >
              {pending ? <Spinner /> : null}
              Xóa hết đánh giá
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
