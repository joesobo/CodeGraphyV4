import { describe, expect, it, vi } from 'vitest';
import { createSnapshotSymbolEntry } from '../../../../../src/extension/pipeline/database/cache/symbolEntry';
import * as cacheRowValues from '../../../../../src/extension/pipeline/database/cache/rowValues';

describe('pipeline/database/cache/symbolEntry', () => {
  it.each([
    ['symbolId', '', 'src/file.ts', 'render', 'function'],
    ['filePath', 'symbol-id', '', 'render', 'function'],
    ['name', 'symbol-id', 'src/file.ts', '', 'function'],
    ['kind', 'symbol-id', 'src/file.ts', 'render', ''],
  ])('returns undefined when the required %s field is missing', (_label, symbolId, filePath, name, kind) => {
    const readRequiredString = vi.spyOn(cacheRowValues, 'readRequiredString');

    readRequiredString
      .mockReturnValueOnce(symbolId)
      .mockReturnValueOnce(filePath)
      .mockReturnValueOnce(name)
      .mockReturnValueOnce(kind);

    expect(
      createSnapshotSymbolEntry({
        symbolId,
        filePath,
        name,
        kind,
      } as never),
    ).toBeUndefined();
  });

  it('builds a symbol entry from required and optional row values', () => {
    expect(
      createSnapshotSymbolEntry({
        symbolId: 'symbol-id',
        filePath: 'src/file.ts',
        name: 'render',
        kind: 'function',
        signature: '(props: Props) => JSX.Element',
        rangeJson: '{"start":{"line":1,"character":0},"end":{"line":3,"character":1}}',
        metadataJson: '{"exported":true}',
      } as never),
    ).toEqual({
      id: 'symbol-id',
      filePath: 'src/file.ts',
      name: 'render',
      kind: 'function',
      signature: '(props: Props) => JSX.Element',
      range: {
        start: { line: 1, character: 0 },
        end: { line: 3, character: 1 },
      },
      metadata: { exported: true },
    });
  });
});
