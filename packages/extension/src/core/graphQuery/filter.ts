import { globMatch } from '../../shared/globMatch';
import type { GraphQueryFilter } from './model';
import type { SortValueReader } from './sort';

type FilterableValue = ReturnType<SortValueReader<unknown>>;

function normalizeValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return '';
}

function valueMatches(value: FilterableValue, filter: GraphQueryFilter): boolean {
  const expected = normalizeValue(filter.value);

  if (Array.isArray(value)) {
    if (filter.op === 'includes') {
      return value.includes(expected);
    }

    return valueMatches(value.join(' '), filter);
  }

  const actual = normalizeValue(value);

  switch (filter.op) {
    case 'equals':
      return actual === expected;
    case 'includes':
      return actual.includes(expected);
    case 'startsWith':
      return actual.startsWith(expected);
    case 'endsWith':
      return actual.endsWith(expected);
    case 'matches':
      return globMatch(actual, expected);
    default:
      return false;
  }
}

export function applyReportFilters<T>(
  items: readonly T[],
  filters: readonly GraphQueryFilter[] | undefined,
  readValue: SortValueReader<T>,
): T[] {
  if (!filters || filters.length === 0) {
    return [...items];
  }

  return items.filter((item) => filters.every((filter) => valueMatches(readValue(item, filter.field), filter)));
}
