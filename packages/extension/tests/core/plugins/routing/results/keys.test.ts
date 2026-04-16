import { describe, expect, it } from 'vitest';
import { getRelationKey } from '../../../../../src/core/plugins/routing/router/results/keys';

describe('routing/results/keys', () => {
  it('includes resolved target fields for call-like relations', () => {
    const baseRelation = {
      kind: 'call' as const,
      sourceId: 'call:run',
      fromFilePath: 'src/app.ts',
      fromSymbolId: 'src/app.ts:function:run',
      specifier: './lib',
    };

    expect(getRelationKey({ ...baseRelation, toFilePath: 'src/a.ts' })).not.toEqual(
      getRelationKey({ ...baseRelation, toFilePath: 'src/b.ts' }),
    );
  });

  it('omits resolved target fields for non-call relations', () => {
    const baseRelation = {
      kind: 'import' as const,
      sourceId: 'import:lib',
      fromFilePath: 'src/app.ts',
      specifier: './lib',
    };

    expect(getRelationKey({ ...baseRelation, toFilePath: 'src/a.ts' })).toEqual(
      getRelationKey({ ...baseRelation, toFilePath: 'src/b.ts' }),
    );
  });
});
