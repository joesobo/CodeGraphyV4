import { describe, expect, it } from 'vitest';
import { createRelationIdentityProperties } from '../../../../../../src/extension/pipeline/database/cache/relation/identityProperties';

describe('pipeline/database/cache/relation/identityProperties', () => {
  it('builds deterministic quoted identity properties for relations', () => {
    expect(
      createRelationIdentityProperties(
        'src/file.ts',
        {
          kind: 'import',
          sourceId: 'source',
          fromFilePath: 'src/from.ts',
          toFilePath: 'src/to.ts',
          fromSymbolId: 'from-symbol',
          toSymbolId: 'to-symbol',
          specifier: './to',
          type: 'static',
          variant: 'named',
        } as never,
        3,
      ),
    ).toEqual([
      'relationId: "src/file.ts|import|source|src/from.ts|src/to.ts|from-symbol|to-symbol|./to|static|named|3"',
      'filePath: "src/file.ts"',
      'kind: "import"',
      'sourceId: "source"',
    ]);
  });

  it('uses empty placeholders for missing optional relation identity fields', () => {
    expect(
      createRelationIdentityProperties(
        'src/file.ts',
        {
          kind: 'call',
          sourceId: 'source',
          fromFilePath: 'src/from.ts',
        } as never,
        0,
      )[0],
    ).toBe('relationId: "src/file.ts|call|source|src/from.ts|||||||0"');
  });
});
