/**
 * Shared pagination helper for handlers that expose offset/limit over arrays.
 */
export interface Paginated<T> {
  total: number;
  offset: number;
  count: number;
  items: T[];
}

export function paginate<T>(items: T[], offset?: number, limit?: number): Paginated<T> {
  const total = items.length;
  const o = offset ?? 0;
  const sliced = limit !== undefined ? items.slice(o, o + limit) : items.slice(o);
  return { total, offset: o, count: sliced.length, items: sliced };
}
