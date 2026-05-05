import { globMatch } from '../../shared/globMatch';
import type { GraphQueryFilter } from './model';
import type { SortValueReader } from './sort';

type FilterableValue = ReturnType<SortValueReader<unknown>>;
type ScalarFilter = (actual: string, expected: string) => boolean;

const SCALAR_FILTERS: Record<GraphQueryFilter['op'], ScalarFilter> = {
  equals: (actual, expected) => actual === expected,
  includes: (actual, expected) => actual.includes(expected),
  startsWith: (actual, expected) => actual.startsWith(expected),
  endsWith: (actual, expected) => actual.endsWith(expected),
  matches: (actual, expected) => globMatch(actual, expected),
};

function normalizeValue(value: unknown): string {
  switch (typeof value) {
    case 'boolean':
    case 'number':
    case 'string':
      return String(value);
    default:
      return '';
  }
}

function valueMatches(value: FilterableValue, filter: GraphQueryFilter): boolean {
  const expected = normalizeValue(filter.value);

  if (Array.isArray(value)) {
    return filter.op === 'includes'
      ? value.includes(expected)
      : valueMatches(value.join(' '), filter);
  }

  const actual = normalizeValue(value);
  return SCALAR_FILTERS[filter.op](actual, expected);
}

export function applyReportFilters<T>(
  items: readonly T[],
  filters: readonly GraphQueryFilter[] | undefined,
  readValue: SortValueReader<T>,
): T[] {
  if (!filters) {
    return [...items];
  }

  return items.filter((item) => filters.every((filter) => valueMatches(readValue(item, filter.field), filter)));
}
