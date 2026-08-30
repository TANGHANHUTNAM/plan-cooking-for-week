"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations";
import {
  clearSessionCookie,
  createSessionToken,
  setSessionCookie,
} from "@/lib/session";

export interface LoginState {
  error?: string;
}

export async function login(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const email = parsed.data.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  const ok =
    user !== null && (await bcrypt.compare(parsed.data.password, user.passwordHash));

  if (!ok || !user) {
    // làm chậm brute-force + không tiết lộ email có tồn tại hay không
    await new Promise((r) => setTimeout(r, 500));
    return { error: "Email hoặc mật khẩu không đúng" };
  }

  await setSessionCookie(await createSessionToken(user));
  redirect("/");
}

export async function logout(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}
