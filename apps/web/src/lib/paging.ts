export type Page<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  nextCursor?: string | null;
};

export function withQuery(
  path: string,
  params: Record<string, string | number | undefined | null>,
) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  if (!query) return path;
  return `${path}${path.includes("?") ? "&" : "?"}${query}`;
}
