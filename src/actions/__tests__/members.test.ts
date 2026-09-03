import { Prisma } from "@/generated/prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  clearSessionCookie: vi.fn(),
  revalidatePath: vi.fn(),
  transaction: vi.fn(),
  userCount: vi.fn(),
  userDelete: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
  },
}));

vi.mock("@/lib/session", () => ({
  clearSessionCookie: mocks.clearSessionCookie,
  getSession: mocks.getSession,
}));

import { deleteMember } from "../members";

describe("deleteMember", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({
      sub: "self",
      email: "self@example.com",
      name: "Self",
      iat: 1,
    });
    mocks.userCount.mockResolvedValue(2);
    mocks.userDelete.mockResolvedValue(undefined);
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        user: {
          count: mocks.userCount,
          delete: mocks.userDelete,
        },
      })
    );
    mocks.clearSessionCookie.mockResolvedValue(undefined);
  });

  it("returns a sign-out result after deleting the current user", async () => {
    await expect(deleteMember("self")).resolves.toEqual({ deletedSelf: true });
    expect(mocks.transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ isolationLevel: "Serializable" })
    );
    expect(mocks.userDelete).toHaveBeenCalledWith({ where: { id: "self" } });
    expect(mocks.clearSessionCookie).toHaveBeenCalledOnce();
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("keeps the session when deleting another member", async () => {
    await expect(deleteMember("other")).resolves.toEqual({});
    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(mocks.clearSessionCookie).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("still prevents deleting the last member", async () => {
    mocks.userCount.mockResolvedValue(1);

    await expect(deleteMember("self")).resolves.toEqual({
      error: "Không thể xóa tài khoản cuối cùng của hệ thống",
    });
    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(mocks.userDelete).not.toHaveBeenCalled();
    expect(mocks.clearSessionCookie).not.toHaveBeenCalled();
  });

  it("returns a retry result for a serialization conflict", async () => {
    mocks.transaction.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("serialization conflict", {
        code: "P2034",
        clientVersion: "test",
      })
    );

    await expect(deleteMember("self")).resolves.toEqual({
      error: "Dữ liệu thành viên vừa thay đổi, vui lòng thử lại",
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
    expect(mocks.clearSessionCookie).not.toHaveBeenCalled();
    expect(mocks.userDelete).not.toHaveBeenCalled();
  });
});
