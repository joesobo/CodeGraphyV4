import type { GraphQueryConfig, GraphQueryPage } from './model';

const DEFAULT_LIMIT = 500;
const DEFAULT_OFFSET = 0;

function normalizeInteger(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.floor(value));
}

export function paginate<T>(
  items: readonly T[],
  config: GraphQueryConfig = {},
): { items: T[]; page: GraphQueryPage } {
  const offset = normalizeInteger(config.offset, DEFAULT_OFFSET);
  const limit = normalizeInteger(config.limit, DEFAULT_LIMIT);
  const pagedItems = items.slice(offset, offset + limit);

  return {
    items: pagedItems,
    page: {
      offset,
      limit,
      returned: pagedItems.length,
      total: items.length,
      nextOffset: pagedItems.length > 0 && offset + pagedItems.length < items.length
        ? offset + pagedItems.length
        : null,
    },
  };
}
