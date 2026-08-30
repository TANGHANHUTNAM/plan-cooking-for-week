"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteMember } from "@/actions/members";
import type { Member } from "@/lib/queries";
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

export function MembersCard({
  members,
  currentUserId,
}: {
  members: Member[];
  currentUserId: string;
}) {
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [deleting, startDeleting] = useTransition();

  const isSelf = deleteTarget?.id === currentUserId;

  const confirmDelete = () => {
    const target = deleteTarget;
    if (!target) return;
    startDeleting(async () => {
      const res = await deleteMember(target.id);
      // tự xóa chính mình: action đã redirect về /login, không chạy tới đây
      if (res.error) toast.error(res.error);
      else toast.success(`Đã xóa tài khoản “${target.name}”`);
      setDeleteTarget(null);
    });
  };

  return (
    <div className="mb-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <p className="mb-1 text-sm font-semibold">
        Thành viên gia đình · {members.length}
      </p>
      <p className="mb-3 text-xs text-muted-foreground">
        Cùng xem một thực đơn chung — đánh dấu ai không ăn ngay trên từng bữa.
      </p>

      <div className="flex flex-col gap-2.5">
        {members.map((member) => (
          <div key={member.id} className="flex items-center gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-sm font-bold text-primary">
              {member.name.charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                {member.name}
                {member.id === currentUserId ? (
                  <span className="ml-1.5 text-xs font-normal text-primary">
                    (bạn)
                  </span>
                ) : null}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {member.email}
              </span>
            </span>
            {members.length > 1 ? (
              <button
                type="button"
                aria-label={`Xóa tài khoản ${member.name}`}
                onClick={() => setDeleteTarget(member)}
                className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Trash2 className="size-4" />
              </button>
            ) : null}
          </div>
        ))}
      </div>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent className="max-w-[calc(100vw_-_2rem)] rounded-2xl sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Xóa tài khoản “{deleteTarget?.name}”?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isSelf
                ? "Đây là tài khoản bạn đang đăng nhập — xóa xong bạn sẽ bị đăng xuất ngay và không đăng nhập lại được bằng tài khoản này."
                : `Tài khoản sẽ không đăng nhập được nữa và các đánh dấu ăn/không ăn của ${deleteTarget?.name ?? ""} bị xóa. Thực đơn và món ăn chung không bị ảnh hưởng.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault(); // giữ dialog mở tới khi xóa xong
                confirmDelete();
              }}
              disabled={deleting}
              variant="destructive"
            >
              {deleting ? <Loader2 className="size-4 animate-spin" /> : null}
              {isSelf ? "Xóa và đăng xuất" : "Xóa tài khoản"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
