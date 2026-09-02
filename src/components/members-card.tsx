"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteMember } from "@/actions/members";
import type { Member } from "@/lib/queries";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
    <Card>
      <CardHeader>
        <CardTitle>Thành viên trong nhà</CardTitle>
        <CardDescription>
          Cả nhà xem chung một thực đơn. Ai không ăn bữa nào thì đánh dấu ngay
          trên bữa đó.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ItemGroup className="gap-1">
          {members.map((member) => (
            <Item key={member.id} size="xs" className="px-0">
              <ItemMedia>
                <Avatar size="sm">
                  <AvatarFallback className="bg-secondary text-xs font-semibold text-primary">
                    {member.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </ItemMedia>
              <ItemContent>
                <ItemTitle>
                  {member.name}
                  {member.id === currentUserId ? (
                    <span className="text-xs font-normal text-primary">
                      (bạn)
                    </span>
                  ) : null}
                </ItemTitle>
                <ItemDescription>{member.email}</ItemDescription>
              </ItemContent>
              {members.length > 1 ? (
                <ItemActions>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Xóa tài khoản ${member.name}`}
                        onClick={() => setDeleteTarget(member)}
                        className="text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Xóa tài khoản</TooltipContent>
                  </Tooltip>
                </ItemActions>
              ) : null}
            </Item>
          ))}
        </ItemGroup>
      </CardContent>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent className="max-w-[calc(100vw_-_2rem)] sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Xóa tài khoản “{deleteTarget?.name}”?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isSelf
                ? "Đây là tài khoản bạn đang đăng nhập. Xóa xong bạn sẽ bị đăng xuất ngay và không đăng nhập lại được bằng tài khoản này."
                : `Tài khoản sẽ không đăng nhập được nữa và các đánh dấu ăn hay vắng của ${deleteTarget?.name ?? ""} bị xóa theo. Thực đơn và món ăn chung không đổi.`}
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
              {deleting ? <Spinner /> : null}
              {isSelf ? "Xóa và đăng xuất" : "Xóa tài khoản"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
