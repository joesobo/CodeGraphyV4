import { describe, expect, it } from 'vitest';
import type { IAnalysisRelationshipEvidence } from '../../../../src/core/plugins/types/contracts';
import {
  normalizeRelationFilePaths,
  relationSortKey,
  sortRelations,
} from '../../../../src/extension/export/symbols/build/relations';

function relation(overrides: Partial<IAnalysisRelationshipEvidence> = {}): IAnalysisRelationshipEvidence {
  return {
    edgeType: 'call',
    sourceId: 'core:treesitter',
    from: { kind: 'file', filePath: 'src/a.ts' },
    target: { kind: 'file', path: 'src/b.ts' },
    ...overrides,
  };
}

describe('extension/export/symbols/build/relations', () => {
  it('builds stable relation sort keys from file and symbol coordinates', () => {
    expect(
      relationSortKey(relation({
        from: { kind: 'symbol', symbolId: 'a#run', filePath: 'src/a.ts' },
        target: { kind: 'symbol', symbolId: 'b#boot', filePath: 'src/b.ts' },
      })),
    ).toBe('src/a.ts:call:src/b.ts:a#run:b#boot');

    expect(relationSortKey(relation({
      edgeType: 'import',
      target: { kind: 'unresolved', specifier: '' },
    }))).toBe('src/a.ts:import:::');
  });

  it('sorts relations by their normalized keys without mutating the input', () => {
    const relations = [
      relation({ from: { kind: 'file', filePath: 'src/b.ts' }, target: { kind: 'file', path: 'src/c.ts' } }),
      relation({ edgeType: 'import', from: { kind: 'file', filePath: 'src/a.ts' }, target: { kind: 'file', path: 'src/b.ts' } }),
      relation({ from: { kind: 'symbol', symbolId: 'run', filePath: 'src/a.ts' }, target: { kind: 'file', path: 'src/b.ts' } }),
    ];

    const sorted = sortRelations(relations);

    expect(sorted).toEqual([
      relations[2],
      relations[1],
      relations[0],
    ]);
    expect(relations[0]?.from).toEqual({ kind: 'file', filePath: 'src/b.ts' });
  });

  it('normalizes relation file paths and preserves missing destinations', () => {
    expect(
      normalizeRelationFilePaths(
        relation(),
        (filePath) => `/workspace/${filePath}`,
      ),
    ).toEqual(
      expect.objectContaining({
        from: { kind: 'file', filePath: '/workspace/src/a.ts' },
        target: { kind: 'file', path: '/workspace/src/b.ts' },
      }),
    );

    expect(
      normalizeRelationFilePaths(
        relation({ target: { kind: 'unresolved', specifier: 'missing' } }),
        (filePath) => `/workspace/${filePath}`,
      ),
    ).toEqual(
      expect.objectContaining({
        from: { kind: 'file', filePath: '/workspace/src/a.ts' },
        target: { kind: 'unresolved', specifier: 'missing' },
      }),
    );
  });
});
