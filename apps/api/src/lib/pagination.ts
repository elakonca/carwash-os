import type { PaginationQuery } from "@carwash/shared";

export function pageArgs(query: Pick<PaginationQuery, "page" | "pageSize" | "cursor">): {
  take: number;
  skip: number;
  cursor?: { id: string };
} {
  if (query.cursor) {
    return {
      take: query.pageSize,
      skip: 1,
      cursor: { id: query.cursor },
    };
  }
  return {
    skip: (query.page - 1) * query.pageSize,
    take: query.pageSize,
  };
}

export function pageMeta<T extends { id: string }>(
  items: T[],
  total: number,
  query: Pick<PaginationQuery, "page" | "pageSize">,
) {
  const nextCursor = items.length === query.pageSize ? (items[items.length - 1]?.id ?? null) : null;
  return {
    items,
    total,
    page: query.page,
    pageSize: query.pageSize,
    nextCursor,
  };
}
