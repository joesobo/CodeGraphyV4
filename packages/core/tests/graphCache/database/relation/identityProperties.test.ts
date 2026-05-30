import { describe, expect, it } from 'vitest';
import { createRelationIdentityProperties } from '../../../../src/graphCache/database/relation/identityProperties';

describe('pipeline/database/cache/relation/identityProperties', () => {
  it('builds deterministic quoted identity properties for relations', () => {
    expect(
      createRelationIdentityProperties(
        'src/file.ts',
        {
          edgeType: 'import',
          sourceId: 'source',
          from: { kind: 'symbol', symbolId: 'from-symbol', filePath: 'src/from.ts' },
          target: { kind: 'symbol', symbolId: 'to-symbol', filePath: 'src/to.ts', specifier: './to' },
          specifier: './to',
          timing: 'static',
          variant: 'named',
        },
        3,
        '/workspace',
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
          edgeType: 'call',
          sourceId: 'source',
          from: { kind: 'file', filePath: 'src/from.ts' },
          target: { kind: 'unresolved', specifier: '' },
        },
        0,
        '/workspace',
      )[0],
    ).toBe('relationId: "src/file.ts|call|source|src/from.ts|||||||0"');
  });
});
