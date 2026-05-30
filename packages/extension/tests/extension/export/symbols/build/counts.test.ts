import { describe, expect, it } from 'vitest';
import {
  countByFilePath,
  countRelationsByFilePath,
  createFileEntries,
} from '../../../../../src/extension/export/symbols/build/counts';

describe('extension/export/symbols/build/counts', () => {
  it('counts symbols by file path', () => {
    expect(
      countByFilePath([
        { filePath: 'src/app.ts' },
        { filePath: 'src/app.ts' },
        { filePath: 'src/lib.ts' },
      ]),
    ).toEqual(
      new Map([
        ['src/app.ts', 2],
        ['src/lib.ts', 1],
      ]),
    );
  });

  it('counts relations for both files only when the target file differs', () => {
    expect(
      countRelationsByFilePath([
        {
          edgeType: 'call',
          sourceId: 'core:treesitter',
          from: { kind: 'file', filePath: 'src/app.ts' },
          target: { kind: 'file', path: 'src/lib.ts' },
        },
        {
          edgeType: 'call',
          sourceId: 'core:treesitter',
          from: { kind: 'file', filePath: 'src/app.ts' },
          target: { kind: 'file', path: 'src/app.ts' },
        },
        {
          edgeType: 'call',
          sourceId: 'core:treesitter',
          from: { kind: 'file', filePath: 'src/lib.ts' },
          target: { kind: 'unresolved', specifier: 'missing' },
        },
      ]),
    ).toEqual(
      new Map([
        ['src/app.ts', 2],
        ['src/lib.ts', 2],
      ]),
    );
  });

  it('creates file entries with zero counts when a file has no symbols or relations', () => {
    expect(
      createFileEntries(
        ['src/app.ts', 'src/lib.ts'],
        new Map([['src/app.ts', 3]]),
        new Map([['src/lib.ts', 2]]),
      ),
    ).toEqual([
      { filePath: 'src/app.ts', symbolCount: 3, relationCount: 0 },
      { filePath: 'src/lib.ts', symbolCount: 0, relationCount: 2 },
    ]);
  });
});
