"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { memberSchema } from "@/lib/validations";

/**
 * Delete an account from the system.
 * - You cannot delete the account you are signed in with (no accidental self lock-out).
 * - Do not allow deleting the last account (locks everyone out).
 * - Cascade-delete that person's meal attendance; shared plans and foods are unaffected.
 */
export interface DeleteMemberResult {
  error?: string;
}

function isSerializationConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

export async function deleteMember(
  userId: string
): Promise<DeleteMemberResult> {
  const session = await getSession();
  if (!session) throw new Error("Chưa đăng nhập");
  if (userId === session.sub) {
    return {
      error:
        "Không xóa được tài khoản bạn đang đăng nhập — nhờ thành viên khác xóa giúp",
    };
  }

  let result: DeleteMemberResult;
  try {
    result = await prisma.$transaction(
      async (tx) => {
        const total = await tx.user.count();
        if (total <= 1) {
          return { error: "Không thể xóa tài khoản cuối cùng của hệ thống" };
        }

        try {
          await tx.user.delete({ where: { id: userId } });
        } catch (error) {
          if (isSerializationConflict(error)) throw error;
          return { error: "Không tìm thấy tài khoản để xóa" };
        }

        return {};
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch (error) {
    if (isSerializationConflict(error)) {
      return { error: "Dữ liệu thành viên vừa thay đổi, vui lòng thử lại" };
    }
    throw error;
  }

  if (result.error) return result;

  revalidatePath("/", "layout");
  return result;
}

export interface MemberFormState {
  error?: string;
  /** Set after a successful save so the client can close the form. */
  savedAt?: number;
}

function isUniqueEmailConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

/**
 * Create an account for another household member. Anyone signed in can do this —
 * the app has no roles, everyone shares one plan.
 */
export async function createMember(
  _prev: MemberFormState,
  formData: FormData
): Promise<MemberFormState> {
  const session = await getSession();
  if (!session) throw new Error("Chưa đăng nhập");

  const parsed = memberSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const email = parsed.data.email.trim().toLowerCase();
  try {
    await prisma.user.create({
      data: {
        email,
        name: parsed.data.name,
        // same cost factor as the seed, so every account verifies the same way
        passwordHash: await bcrypt.hash(parsed.data.password, 10),
      },
    });
  } catch (error) {
    if (isUniqueEmailConflict(error)) {
      return { error: "Email này đã có tài khoản rồi" };
    }
    return {
      error: "Không tạo được tài khoản — kiểm tra mạng rồi thử lại nhé",
    };
  }

  revalidatePath("/", "layout");
  return { savedAt: Date.now() };
}
