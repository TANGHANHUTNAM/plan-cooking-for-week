/**
 * Return new tags that are not already in the current list.
 * Compare case-insensitively and remove duplicates from the same input.
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
