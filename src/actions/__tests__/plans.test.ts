import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  foodFindMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    food: { findMany: mocks.foodFindMany },
  },
}));

vi.mock("@/lib/session", () => ({
  getSession: mocks.getSession,
}));

import { loadSwapFoods } from "../plans";

describe("loadSwapFoods", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({
      sub: "self",
      email: "self@example.com",
      name: "Self",
      iat: 1,
    });
  });

  it("requires a session before loading the picker", async () => {
    mocks.getSession.mockResolvedValue(null);

    await expect(loadSwapFoods()).rejects.toThrow("Chưa đăng nhập");
    expect(mocks.foodFindMany).not.toHaveBeenCalled();
  });

  it("returns only the fields used by the manual picker", async () => {
    mocks.foodFindMany.mockResolvedValue([
      {
        id: "food-1",
        name: "Cá kho",
        type: "MAIN",
        cookingMethod: "Kho",
        favoriteScore: 5,
        statistic: { totalCooked: 3 },
      },
    ]);

    await expect(loadSwapFoods()).resolves.toEqual({
      foods: [
        {
          id: "food-1",
          name: "Cá kho",
          type: "MAIN",
          cookingMethod: "Kho",
          favoriteScore: 5,
          totalCooked: 3,
        },
      ],
    });
    expect(mocks.foodFindMany).toHaveBeenCalledWith({
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
        type: true,
        cookingMethod: true,
        favoriteScore: true,
        statistic: { select: { totalCooked: true } },
      },
    });
  });

  it("reports a picker query failure instead of treating it as empty", async () => {
    mocks.foodFindMany.mockRejectedValue(new Error("database unavailable"));

    await expect(loadSwapFoods()).resolves.toEqual({
      error: "Không tải được danh sách món — kiểm tra mạng rồi thử lại nhé",
    });
  });
});
