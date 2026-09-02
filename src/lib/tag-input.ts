/**
 * Trả về các tag mới chưa xuất hiện trong danh sách hiện tại.
 * So sánh không phân biệt hoa thường và cũng loại trùng trong cùng một lần nhập.
 */
export function appendUniqueTags(
  current: string[],
  additions: string[]
): string[] {
  const seen = new Set(current.map((tag) => tag.trim().toLowerCase()));

  return additions.filter((tag) => {
    const normalized = tag.trim().toLowerCase();
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}
