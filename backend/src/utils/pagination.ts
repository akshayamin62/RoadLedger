export function parsePagination(query: Record<string, unknown>) {
  const page = Math.max(1, Number(query.page ?? 1) || 1);
  const limit = Math.min(500, Math.max(1, Number(query.limit ?? 10) || 10));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
