import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  revalidatePath: vi.fn(),
  foodUpdateMany: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    food: { updateMany: mocks.foodUpdateMany },
  },
}));

vi.mock("@/lib/session", () => ({
  getSession: mocks.getSession,
}));

import { resetAllFavorites } from "../foods";

describe("resetAllFavorites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({
      sub: "self",
      email: "self@example.com",
      name: "Self",
      iat: 1,
    });
  });

  it("requires a session before touching any rating", async () => {
    mocks.getSession.mockResolvedValue(null);

    await expect(resetAllFavorites()).rejects.toThrow("Chưa đăng nhập");
    expect(mocks.foodUpdateMany).not.toHaveBeenCalled();
  });

  it("clears every rated dish in one write and reports how many changed", async () => {
    mocks.foodUpdateMany.mockResolvedValue({ count: 7 });

    await expect(resetAllFavorites()).resolves.toEqual({ resetCount: 7 });
    expect(mocks.foodUpdateMany).toHaveBeenCalledWith({
      where: { favoriteScore: { not: 0 } },
      data: { favoriteScore: 0 },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("reports zero when nothing was rated instead of failing", async () => {
    mocks.foodUpdateMany.mockResolvedValue({ count: 0 });

    await expect(resetAllFavorites()).resolves.toEqual({ resetCount: 0 });
  });

  it("surfaces a write failure instead of claiming success", async () => {
    mocks.foodUpdateMany.mockRejectedValue(new Error("database unavailable"));

    await expect(resetAllFavorites()).resolves.toEqual({
      error: "Không xóa được đánh giá — kiểm tra mạng rồi thử lại nhé",
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
