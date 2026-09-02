"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { logout } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function LogoutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="destructive"
      size="lg"
      disabled={pending}
      onClick={() => startTransition(() => logout())}
      className="h-10 w-full text-sm font-semibold sm:w-auto sm:px-8"
    >
      {pending ? <Spinner /> : <LogOut />}
      Đăng xuất
    </Button>
  );
}
