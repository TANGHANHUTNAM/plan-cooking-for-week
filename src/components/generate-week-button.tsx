"use client";

import { useState, useTransition } from "react";
import { Dices, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { generateWeek } from "@/actions/plans";
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

export function GenerateWeekButton({
  weekStart,
  hasPlan,
  label = "Random tuần",
  variant = "default",
  className,
}: {
  weekStart: string;
  hasPlan: boolean;
  label?: string;
  variant?: "default" | "secondary" | "outline";
  className?: string;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const run = () =>
    startTransition(async () => {
      const res = await generateWeek(weekStart);
      if (res.error) toast.error(res.error);
      else toast.success("Đã random thực đơn cho cả tuần");
    });

  return (
    <>
      <Button
        variant={variant}
        className={className}
        disabled={pending}
        onClick={() => (hasPlan ? setConfirmOpen(true) : run())}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Dices className="size-4" />
        )}
        {label}
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="max-w-[calc(100vw_-_2rem)] rounded-2xl sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Random lại cả tuần?</AlertDialogTitle>
            <AlertDialogDescription>
              Toàn bộ thực đơn tuần này sẽ được thay mới, kể cả các bữa bạn đã
              chỉnh tay.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={run}>Random lại</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
