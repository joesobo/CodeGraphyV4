import { describe, expect, it } from 'vitest';
import { paginate } from '../../src/graphQuery/pagination';

const items = ['a', 'b', 'c', 'd'];

describe('core/graphQuery pagination', () => {
  it('uses default page limits when none are provided', () => {
    expect(paginate(items)).toEqual({
      items,
      page: {
        offset: 0,
        limit: 500,
        returned: 4,
        total: 4,
        nextOffset: null,
      },
    });
  });

  it('normalizes invalid limits and offsets', () => {
    expect(paginate(items, { offset: Number.NaN, limit: -2 })).toEqual({
      items: [],
      page: {
        offset: 0,
        limit: 0,
        returned: 0,
        total: 4,
        nextOffset: null,
      },
    });
  });

  it('floors fractional page inputs before slicing', () => {
    expect(paginate(items, { offset: 1.9, limit: 2.1 })).toEqual({
      items: ['b', 'c'],
      page: {
        offset: 1,
        limit: 2,
        returned: 2,
        total: 4,
        nextOffset: 3,
      },
    });
  });
});
