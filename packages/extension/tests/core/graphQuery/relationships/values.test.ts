import { describe, expect, it } from 'vitest';
import { readRelationshipReportValue } from '../../../../src/core/graphQuery/relationships/values';

const item = {
  from: 'src/a.ts',
  to: 'src/b.ts',
  relationships: [
    { edgeType: 'import' as const, symbols: [] },
    { edgeType: 'reference' as const, symbols: [] },
  ],
};

describe('core/graphQuery/relationships/values', () => {
  it('reads endpoints and edge type lists for filtering and sorting', () => {
    expect(readRelationshipReportValue(item, 'from')).toBe('src/a.ts');
    expect(readRelationshipReportValue(item, 'to')).toBe('src/b.ts');
    expect(readRelationshipReportValue(item, 'edgeType')).toEqual(['import', 'reference']);
    expect(readRelationshipReportValue(item, 'edgeTypes')).toEqual(['import', 'reference']);
    expect(readRelationshipReportValue(item, 'unknown')).toBe('');
  });
});
