import { describe, expect, it } from 'vitest';
import type { GraphQueryRelationshipKindGroup } from '../../../src/graphQuery/model';
import { appendUniqueSymbol } from '../../../src/graphQuery/relationships/groupSymbols';

describe('core/graphQuery/relationships/groupSymbols', () => {
  it('appends symbols once by display identity and ignores missing symbols', () => {
    const group: GraphQueryRelationshipKindGroup = {
      edgeType: 'reference',
      symbols: [],
    };

    appendUniqueSymbol(group, undefined);
    appendUniqueSymbol(group, {
      id: 'one',
      filePath: 'src/a.ts',
      name: 'buildUser',
      kind: 'function',
      range: { startLine: 10, endLine: 12 },
    });
    appendUniqueSymbol(group, {
      id: 'two',
      filePath: 'src/b.ts',
      name: 'buildUser',
      kind: 'function',
      range: { startLine: 10, endLine: 12 },
    });
    appendUniqueSymbol(group, {
      id: 'three',
      filePath: 'src/b.ts',
      name: 'buildUser',
      kind: 'function',
      range: { startLine: 11, endLine: 12 },
    });

    expect(group.symbols).toEqual([
      {
        id: 'one',
        filePath: 'src/a.ts',
        name: 'buildUser',
        kind: 'function',
        range: { startLine: 10, endLine: 12 },
      },
      {
        id: 'three',
        filePath: 'src/b.ts',
        name: 'buildUser',
        kind: 'function',
        range: { startLine: 11, endLine: 12 },
      },
    ]);
  });
});
