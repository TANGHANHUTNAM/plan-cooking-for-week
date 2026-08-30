"use client";

import { useState, useTransition } from "react";
import { CopyCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { copyLastWeek } from "@/actions/plans";
import { Button } from "@/components/ui/button";
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

export function CopyLastWeekButton({
  weekStart,
  hasPlan,
  className,
}: {
  weekStart: string;
  hasPlan: boolean;
  className?: string;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const run = () =>
    startTransition(async () => {
      const res = await copyLastWeek(weekStart);
      if (res.error) toast.error(res.error);
      else toast.success("Đã copy thực đơn tuần trước");
    });

  return (
    <>
      <Button
        variant="outline"
        className={className}
        disabled={pending}
        onClick={() => (hasPlan ? setConfirmOpen(true) : run())}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <CopyCheck className="size-4" />
        )}
        Copy tuần trước
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="max-w-[calc(100vw_-_2rem)] rounded-2xl sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Copy tuần trước?</AlertDialogTitle>
            <AlertDialogDescription>
              Thực đơn hiện tại của tuần này sẽ được thay bằng bản copy của tuần
              trước.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={run}>Copy</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
