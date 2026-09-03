"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { createMember, type MemberFormState } from "@/actions/members";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { ResponsiveSheet } from "@/components/responsive-sheet";

function MemberForm({ onSaved }: { onSaved: () => void }) {
  const [state, formAction, pending] = useActionState<
    MemberFormState,
    FormData
  >(createMember, {});
  const [showPassword, setShowPassword] = useState(false);
  const handledSave = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (state.savedAt && state.savedAt !== handledSave.current) {
      handledSave.current = state.savedAt;
      toast.success("Đã thêm thành viên");
      onSaved();
    }
  }, [state.savedAt, onSaved]);

  return (
    <form action={formAction}>
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel htmlFor="member-name" className="text-sm">
            Tên gọi trong nhà
          </FieldLabel>
          <Input
            id="member-name"
            name="name"
            placeholder="Ví dụ: Bảo"
            autoComplete="off"
            required
            className="h-11 text-base md:text-sm"
          />
          <FieldDescription>
            Tên này hiện ở phần điểm danh từng bữa.
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="member-email" className="text-sm">
            Email đăng nhập
          </FieldLabel>
          <Input
            id="member-email"
            name="email"
            type="email"
            inputMode="email"
            placeholder="bao@gmail.com"
            autoComplete="off"
            required
            className="h-11 text-base md:text-sm"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="member-password" className="text-sm">
            Mật khẩu
          </FieldLabel>
          <InputGroup className="h-11">
            <InputGroupInput
              id="member-password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Ít nhất 6 ký tự"
              autoComplete="new-password"
              required
              minLength={6}
              className="text-base md:text-sm"
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                type="button"
                size="icon-xs"
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          <FieldDescription>
            Nhớ nói lại mật khẩu này cho thành viên đó — app không gửi email.
          </FieldDescription>
        </Field>

        {state.error ? <FieldError>{state.error}</FieldError> : null}

        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="h-11 w-full text-sm font-semibold"
        >
          {pending ? <Spinner /> : null}
          Thêm thành viên
        </Button>
      </FieldGroup>
    </form>
  );
}

/** Create an account for someone else in the household (Settings → Thành viên). */
export function MemberFormSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Thêm thành viên"
      description="Tài khoản mới đăng nhập được ngay và xem chung thực đơn của cả nhà."
    >
      <MemberForm onSaved={() => onOpenChange(false)} />
    </ResponsiveSheet>
  );
}
