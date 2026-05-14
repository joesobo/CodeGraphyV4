import type { GraphQuerySort } from './model';

type SortableValue = boolean | number | string | readonly string[] | null | undefined;

export type SortValueReader<T> = (item: T, field: string) => SortableValue;

function normalizeSortValue(value: SortableValue): string | number {
  if (typeof value === 'number') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.join('\u0000');
  }

  return String(value ?? '');
}

function compareValues(left: SortableValue, right: SortableValue): number {
  const normalizedLeft = normalizeSortValue(left);
  const normalizedRight = normalizeSortValue(right);

  if (typeof normalizedLeft === 'number' && typeof normalizedRight === 'number') {
    return normalizedLeft - normalizedRight;
  }

  return String(normalizedLeft).localeCompare(String(normalizedRight));
}

function mergeSorts(
  requestedSort: readonly GraphQuerySort[] | undefined,
  defaultSort: readonly GraphQuerySort[],
): GraphQuerySort[] {
  const sort = [...(requestedSort ?? [])];
  const requestedFields = new Set(sort.map((item) => item.by));

  for (const item of defaultSort) {
    if (!requestedFields.has(item.by)) {
      sort.push(item);
    }
  }

  return sort;
}

export function sortItems<T>(
  items: readonly T[],
  requestedSort: readonly GraphQuerySort[] | undefined,
  defaultSort: readonly GraphQuerySort[],
  readValue: SortValueReader<T>,
): T[] {
  const sort = mergeSorts(requestedSort, defaultSort);

  return [...items].sort((left, right) => {
    for (const item of sort) {
      const comparison = compareValues(readValue(left, item.by), readValue(right, item.by));
      if (comparison !== 0) {
        return item.direction === 'desc' ? -comparison : comparison;
      }
    }

    return 0;
  });
}
