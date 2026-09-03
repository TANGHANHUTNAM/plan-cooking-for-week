import { Prisma } from "@/generated/prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  revalidatePath: vi.fn(),
  transaction: vi.fn(),
  userCount: vi.fn(),
  userDelete: vi.fn(),
  userCreate: vi.fn(),
  hash: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
    user: { create: mocks.userCreate },
  },
}));

vi.mock("@/lib/session", () => ({
  getSession: mocks.getSession,
}));

vi.mock("bcryptjs", () => ({
  default: { hash: mocks.hash },
}));

import { createMember, deleteMember } from "../members";

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
  });

  it("refuses to delete the account you are signed in with", async () => {
    await expect(deleteMember("self")).resolves.toEqual({
      error:
        "Không xóa được tài khoản bạn đang đăng nhập — nhờ thành viên khác xóa giúp",
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.userDelete).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("deletes another member", async () => {
    await expect(deleteMember("other")).resolves.toEqual({});
    expect(mocks.transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ isolationLevel: "Serializable" })
    );
    expect(mocks.userDelete).toHaveBeenCalledWith({ where: { id: "other" } });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("still prevents deleting the last member", async () => {
    mocks.userCount.mockResolvedValue(1);

    await expect(deleteMember("other")).resolves.toEqual({
      error: "Không thể xóa tài khoản cuối cùng của hệ thống",
    });
    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(mocks.userDelete).not.toHaveBeenCalled();
  });

  it("returns a retry result for a serialization conflict", async () => {
    mocks.transaction.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("serialization conflict", {
        code: "P2034",
        clientVersion: "test",
      })
    );

    await expect(deleteMember("other")).resolves.toEqual({
      error: "Dữ liệu thành viên vừa thay đổi, vui lòng thử lại",
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
    expect(mocks.userDelete).not.toHaveBeenCalled();
  });
});

function memberForm(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
}

describe("createMember", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({
      sub: "self",
      email: "self@example.com",
      name: "Self",
      iat: 1,
    });
    mocks.hash.mockResolvedValue("hashed");
    mocks.userCreate.mockResolvedValue({ id: "new" });
  });

  it("requires a session", async () => {
    mocks.getSession.mockResolvedValue(null);

    await expect(
      createMember(
        {},
        memberForm({ name: "Bảo", email: "bao@gmail.com", password: "abc123" })
      )
    ).rejects.toThrow("Chưa đăng nhập");
    expect(mocks.userCreate).not.toHaveBeenCalled();
  });

  it("stores a lowercased email and a bcrypt hash", async () => {
    const result = await createMember(
      {},
      memberForm({
        name: "  Bảo  ",
        email: "Bao@Gmail.com",
        password: "abc123",
      })
    );

    expect(result.error).toBeUndefined();
    expect(result.savedAt).toBeTypeOf("number");
    expect(mocks.hash).toHaveBeenCalledWith("abc123", 10);
    expect(mocks.userCreate).toHaveBeenCalledWith({
      data: { email: "bao@gmail.com", name: "Bảo", passwordHash: "hashed" },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("rejects a bad email or a short password without touching the database", async () => {
    await expect(
      createMember(
        {},
        memberForm({
          name: "Bảo",
          email: "không-phải-email",
          password: "abc123",
        })
      )
    ).resolves.toEqual({ error: "Email không hợp lệ" });
    await expect(
      createMember(
        {},
        memberForm({ name: "Bảo", email: "bao@gmail.com", password: "123" })
      )
    ).resolves.toEqual({ error: "Mật khẩu cần ít nhất 6 ký tự" });
    expect(mocks.userCreate).not.toHaveBeenCalled();
  });

  it("reports a duplicate email instead of crashing", async () => {
    mocks.userCreate.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("unique", {
        code: "P2002",
        clientVersion: "test",
      })
    );

    await expect(
      createMember(
        {},
        memberForm({ name: "Bảo", email: "bao@gmail.com", password: "abc123" })
      )
    ).resolves.toEqual({ error: "Email này đã có tài khoản rồi" });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
