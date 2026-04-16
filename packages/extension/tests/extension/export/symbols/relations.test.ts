import { describe, expect, it } from 'vitest';
import {
  normalizeRelationFilePaths,
  relationSortKey,
  sortRelations,
} from '../../../../src/extension/export/symbols/build/relations';

describe('extension/export/symbols/build/relations', () => {
  it('builds stable relation sort keys from file and symbol coordinates', () => {
    expect(
      relationSortKey({
        fromFilePath: 'src/a.ts',
        kind: 'call',
        toFilePath: 'src/b.ts',
        fromSymbolId: 'a#run',
        toSymbolId: 'b#boot',
      } as never),
    ).toBe('src/a.ts:call:src/b.ts:a#run:b#boot');

    expect(
      relationSortKey({
        fromFilePath: 'src/a.ts',
        kind: 'import',
      } as never),
    ).toBe('src/a.ts:import:::');
  });

  it('sorts relations by their normalized keys without mutating the input', () => {
    const relations = [
      { fromFilePath: 'src/b.ts', kind: 'call', toFilePath: 'src/c.ts' },
      { fromFilePath: 'src/a.ts', kind: 'import', toFilePath: 'src/b.ts' },
      { fromFilePath: 'src/a.ts', kind: 'call', toFilePath: 'src/b.ts', fromSymbolId: 'run' },
    ] as never[];

    const sorted = sortRelations(relations);

    expect(sorted).toEqual([
      relations[2],
      relations[1],
      relations[0],
    ]);
    expect(relations).toEqual([
      { fromFilePath: 'src/b.ts', kind: 'call', toFilePath: 'src/c.ts' },
      { fromFilePath: 'src/a.ts', kind: 'import', toFilePath: 'src/b.ts' },
      { fromFilePath: 'src/a.ts', kind: 'call', toFilePath: 'src/b.ts', fromSymbolId: 'run' },
    ]);
  });

  it('normalizes relation file paths and preserves missing destinations', () => {
    expect(
      normalizeRelationFilePaths(
        {
          fromFilePath: 'src/a.ts',
          toFilePath: 'src/b.ts',
          kind: 'call',
        } as never,
        (filePath) => `/workspace/${filePath}`,
      ),
    ).toEqual(
      expect.objectContaining({
        fromFilePath: '/workspace/src/a.ts',
        toFilePath: '/workspace/src/b.ts',
      }),
    );

    expect(
      normalizeRelationFilePaths(
        {
          fromFilePath: 'src/a.ts',
          kind: 'call',
        } as never,
        (filePath) => `/workspace/${filePath}`,
      ),
    ).toEqual(
      expect.objectContaining({
        fromFilePath: '/workspace/src/a.ts',
        toFilePath: undefined,
      }),
    );
  });
});
