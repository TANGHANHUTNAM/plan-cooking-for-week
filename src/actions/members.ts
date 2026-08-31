"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { clearSessionCookie, getSession } from "@/lib/session";

/**
 * Xóa một tài khoản khỏi hệ thống.
 * - Không cho xóa tài khoản cuối cùng (khóa cửa cả nhà).
 * - Đánh dấu ăn/không ăn của người đó bị xóa theo (cascade); thực đơn + món ăn chung không ảnh hưởng.
 * - Tự xóa chính mình thì đăng xuất ngay.
 */
export async function deleteMember(
  userId: string
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) throw new Error("Chưa đăng nhập");

  const total = await prisma.user.count();
  if (total <= 1) {
    return { error: "Không thể xóa tài khoản cuối cùng của hệ thống" };
  }

  try {
    await prisma.user.delete({ where: { id: userId } });
  } catch {
    return { error: "Không tìm thấy tài khoản để xóa" };
  }

  if (userId === session.sub) {
    await clearSessionCookie();
    redirect("/login");
  }

  revalidatePath("/", "layout");
  return {};
}
