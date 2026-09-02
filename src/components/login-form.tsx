"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    login,
    {}
  );

  return (
    <form action={formAction}>
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel htmlFor="email" className="text-sm">
            Email
          </FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="nam@gmail.com"
            required
            aria-invalid={state.error ? true : undefined}
            className="h-11 text-base md:text-sm"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="password" className="text-sm">
            Mật khẩu
          </FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
            aria-invalid={state.error ? true : undefined}
            className="h-11 text-base md:text-sm"
          />
        </Field>

        {state.error ? <FieldError>{state.error}</FieldError> : null}

        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="mt-1 h-11 w-full text-sm font-semibold"
        >
          {pending ? <Spinner /> : null}
          Đăng nhập
        </Button>
      </FieldGroup>
    </form>
  );
}
