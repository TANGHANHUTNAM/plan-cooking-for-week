import { describe, expect, it } from "vitest";
import { appendUniqueTags } from "../tag-input";

describe("appendUniqueTags", () => {
  it("loại trùng hoa thường trong cùng một lần nhập", () => {
    expect(appendUniqueTags([], ["Egg", "egg"])).toEqual(["Egg"]);
  });

  it("loại trùng hoa thường với tag đã có", () => {
    expect(appendUniqueTags(["Egg"], ["egg", "Salt"])).toEqual(["Salt"]);
  });

  it("giữ nguyên thứ tự của các tag mới hợp lệ", () => {
    expect(
      appendUniqueTags(["Egg"], ["  egg ", "Salt", "Pepper", "salt"])
    ).toEqual(["Salt", "Pepper"]);
  });
});
