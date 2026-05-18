import { describe, expect, it } from 'vitest';
import { applyReportFilters } from '../../src/graphQuery/filter';
import type { SortValueReader } from '../../src/graphQuery/sort';

interface FilterFixture {
  label: string;
  active?: boolean;
  count?: number;
  tags?: string[];
}

const items: FilterFixture[] = [
  { label: 'alpha', active: true, count: 2, tags: ['ui', 'graph'] },
  { label: 'beta', active: false, count: 10, tags: ['cli'] },
  { label: 'gamma' },
];

const readValue: SortValueReader<FilterFixture> = (item, field) => {
  switch (field) {
    case 'active':
      return item.active;
    case 'count':
      return item.count;
    case 'label':
      return item.label;
    case 'tags':
      return item.tags;
    default:
      return null;
  }
};

describe('core/graphQuery report filters', () => {
  it('returns every item when no filters are requested', () => {
    expect(applyReportFilters(items, [], readValue)).toEqual(items);
  });

  it('normalizes scalar values before comparison', () => {
    expect(applyReportFilters(items, [
      { field: 'active', op: 'equals', value: 'true' },
      { field: 'count', op: 'equals', value: '2' },
    ], readValue)).toEqual([items[0]]);
  });

  it('matches array values by exact membership for includes filters', () => {
    expect(applyReportFilters(items, [
      { field: 'tags', op: 'includes', value: 'ui' },
    ], readValue)).toEqual([items[0]]);

    expect(applyReportFilters(items, [
      { field: 'tags', op: 'includes', value: 'gra' },
    ], readValue)).toEqual([]);
  });

  it('matches array values as joined text for non-includes filters', () => {
    expect(applyReportFilters(items, [
      { field: 'tags', op: 'startsWith', value: 'ui graph' },
    ], readValue)).toEqual([items[0]]);
  });

  it('uses empty text for missing values', () => {
    expect(applyReportFilters(items, [
      { field: 'missing', op: 'equals', value: '' },
    ], readValue)).toEqual(items);
  });

  it('supports glob-style matches', () => {
    expect(applyReportFilters(items, [
      { field: 'label', op: 'matches', value: 'a*' },
    ], readValue)).toEqual([items[0]]);
  });
});
