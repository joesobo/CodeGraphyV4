import { describe, expect, it, vi } from 'vitest';
import { createSnapshotRelationEntry } from '../../../../src/graphCache/database/relation/entry';
import * as cacheRowValues from '../../../../src/graphCache/database/records/values';

describe('pipeline/database/cache/relation/entry', () => {
  it.each([
    ['filePath', '', 'import', 'source', 'src/from.ts'],
    ['kind', 'src/file.ts', '', 'source', 'src/from.ts'],
    ['sourceId', 'src/file.ts', 'import', '', 'src/from.ts'],
    ['fromFilePath', 'src/file.ts', 'import', 'source', ''],
  ])('returns undefined when the required %s field is missing', (_label, filePath, kind, sourceId, fromFilePath) => {
    const readRequiredString = vi.spyOn(cacheRowValues, 'readRequiredString');

    readRequiredString
      .mockReturnValueOnce(filePath)
      .mockReturnValueOnce(kind)
      .mockReturnValueOnce(sourceId)
      .mockReturnValueOnce(fromFilePath);

    expect(
      createSnapshotRelationEntry({
        filePath,
        kind,
        sourceId,
        fromFilePath,
      } as never),
    ).toBeUndefined();
  });

  it('builds a relation entry from required and optional row values', () => {
    expect(
      createSnapshotRelationEntry({
        filePath: 'src/file.ts',
        kind: 'import',
        sourceId: 'source',
        fromFilePath: 'src/from.ts',
        pluginId: 'plugin.typescript',
        toFilePath: 'src/to.ts',
        fromNodeId: 'from-node',
        toNodeId: 'to-node',
        fromSymbolId: 'from-symbol',
        toSymbolId: 'to-symbol',
        specifier: './to',
        relationType: 'static',
        variant: 'named',
        resolvedPath: '/workspace/src/to.ts',
        metadataJson: '{"weight":2}',
      } as never),
    ).toEqual({
      edgeType: 'import',
      pluginId: 'plugin.typescript',
      sourceId: 'source',
      from: { kind: 'symbol', symbolId: 'from-symbol', filePath: 'src/from.ts' },
      target: { kind: 'symbol', symbolId: 'to-symbol', filePath: 'src/to.ts', specifier: './to' },
      specifier: './to',
      timing: 'static',
      variant: 'named',
      metadata: { weight: 2 },
    });
  });
});
