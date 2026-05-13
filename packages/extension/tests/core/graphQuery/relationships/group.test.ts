import { describe, expect, it } from 'vitest';
import { groupRelationshipEvidence } from '../../../../src/core/graphQuery/relationships/group';
import type { RelationshipEvidence } from '../../../../src/core/graphQuery/relationships/model';

describe('core/graphQuery/relationships/group', () => {
  it('groups evidence by endpoints, edge type, and provenance while deduplicating symbols', () => {
    const evidence: RelationshipEvidence[] = [
      {
        from: 'src/a.ts',
        to: 'src/b.ts',
        edgeType: 'reference',
        provenance: { pluginId: 'plugin.forms', sourceId: 'form-reference' },
        symbol: { id: 'symbol-1', filePath: 'src/b.ts', name: 'buildUser', kind: 'function' },
      },
      {
        from: 'src/a.ts',
        to: 'src/b.ts',
        edgeType: 'reference',
        provenance: { pluginId: 'plugin.forms', sourceId: 'form-reference' },
        symbol: { id: 'symbol-1b', filePath: 'src/b.ts', name: 'buildUser', kind: 'function' },
      },
      {
        from: 'src/a.ts',
        to: 'src/b.ts',
        edgeType: 'import',
        symbol: { id: 'symbol-2', filePath: 'src/b.ts', name: 'User', range: { startLine: 2, endLine: 3 } },
      },
      {
        from: 'src/c.ts',
        to: 'src/b.ts',
        edgeType: 'reference',
      },
    ];

    expect(groupRelationshipEvidence(evidence)).toEqual([
      {
        from: 'src/a.ts',
        to: 'src/b.ts',
        relationships: [
          {
            edgeType: 'import',
            symbols: [
              { id: 'symbol-2', filePath: 'src/b.ts', name: 'User', range: { startLine: 2, endLine: 3 } },
            ],
          },
          {
            edgeType: 'reference',
            provenance: { pluginId: 'plugin.forms', sourceId: 'form-reference' },
            symbols: [
              { id: 'symbol-1', filePath: 'src/b.ts', name: 'buildUser', kind: 'function' },
            ],
          },
        ],
      },
      {
        from: 'src/c.ts',
        to: 'src/b.ts',
        relationships: [
          {
            edgeType: 'reference',
            symbols: [],
          },
        ],
      },
    ]);
  });
});
