"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { clearSessionCookie, getSession } from "@/lib/session";

/**
 * Delete an account from the system.
 * - Do not allow deleting the last account (locks everyone out).
 * - Cascade-delete that person's meal attendance; shared plans and foods are unaffected.
 * - Deleting yourself logs out immediately.
 */
export interface DeleteMemberResult {
  error?: string;
  deletedSelf?: boolean;
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

        return userId === session.sub ? { deletedSelf: true } : {};
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
  if (result.deletedSelf) {
    await clearSessionCookie();
  }

  return result;
}
