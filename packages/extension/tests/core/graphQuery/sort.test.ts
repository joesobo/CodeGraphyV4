import { describe, expect, it } from 'vitest';
import { sortItems } from '../../../src/core/graphQuery/sort';
import type { GraphQuerySort } from '../../../src/core/graphQuery';
import type { SortValueReader } from '../../../src/core/graphQuery/sort';

interface SortFixture {
  name: string;
  rank?: number;
  tags?: string[];
}

const items: SortFixture[] = [
  { name: 'beta', rank: 2, tags: ['ui', 'graph'] },
  { name: 'alpha', rank: 10, tags: ['cli'] },
  { name: 'alpha', rank: 1, tags: ['api'] },
];

const readValue: SortValueReader<SortFixture> = (item, field) => {
  switch (field) {
    case 'name':
      return item.name;
    case 'rank':
      return item.rank;
    case 'tags':
      return item.tags;
    default:
      return undefined;
  }
};

function sortedNames(sort: readonly GraphQuerySort[] | undefined): string[] {
  return sortItems(items, sort, [{ by: 'name', direction: 'asc' }], readValue)
    .map((item) => `${item.name}:${item.rank}`);
}

describe('core/graphQuery sortItems', () => {
  it('sorts with requested fields before default tie breakers', () => {
    expect(sortedNames([{ by: 'rank', direction: 'asc' }])).toEqual([
      'alpha:1',
      'beta:2',
      'alpha:10',
    ]);
  });

  it('honors descending sort direction', () => {
    expect(sortedNames([{ by: 'rank', direction: 'desc' }])).toEqual([
      'alpha:10',
      'beta:2',
      'alpha:1',
    ]);
  });

  it('does not duplicate default fields already requested', () => {
    expect(sortedNames([{ by: 'name', direction: 'desc' }])).toEqual([
      'beta:2',
      'alpha:10',
      'alpha:1',
    ]);
  });

  it('normalizes array and missing values for string comparison', () => {
    expect(sortItems(items, [{ by: 'tags', direction: 'asc' }], [], readValue)
      .map((item) => item.name)).toEqual(['alpha', 'alpha', 'beta']);
  });
});
