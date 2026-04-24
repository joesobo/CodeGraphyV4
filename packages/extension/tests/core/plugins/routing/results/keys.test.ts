import { describe, expect, it } from 'vitest';
import { getRelationKey } from '../../../../../src/core/plugins/routing/router/results/keys';

describe('routing/results/keys', () => {
  it('serializes every base relation field in order and uses empty placeholders for missing optionals', () => {
    expect(
      getRelationKey({
        kind: 'import',
        sourceId: 'import:lib',
        fromFilePath: 'src/app.ts',
      } as never),
    ).toBe('import|import:lib|src/app.ts|||||');

    expect(
      getRelationKey({
        kind: 'import',
        sourceId: 'import:lib',
        fromFilePath: 'src/app.ts',
        fromNodeId: 'node-a',
        fromSymbolId: 'symbol-a',
        specifier: './lib',
        type: 'value',
        variant: 'static',
      } as never),
    ).toBe('import|import:lib|src/app.ts|node-a|symbol-a|./lib|value|static');
  });

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

  it('includes every resolved target field for call and reference relations', () => {
    expect(
      getRelationKey({
        kind: 'call',
        sourceId: 'call:run',
        fromFilePath: 'src/app.ts',
        fromNodeId: 'caller-node',
        fromSymbolId: 'caller-symbol',
        specifier: './lib',
        type: 'value',
        variant: 'static',
        toFilePath: 'src/lib.ts',
        toNodeId: 'callee-node',
        toSymbolId: 'callee-symbol',
        resolvedPath: '/workspace/src/lib.ts',
      } as never),
    ).toBe(
      'call|call:run|src/app.ts|caller-node|caller-symbol|./lib|value|static|src/lib.ts|callee-node|callee-symbol|/workspace/src/lib.ts',
    );

    expect(
      getRelationKey({
        kind: 'reference',
        sourceId: 'reference:run',
        fromFilePath: 'src/app.ts',
        toFilePath: 'src/lib.ts',
      } as never),
    ).toBe('reference|reference:run|src/app.ts||||||src/lib.ts|||');
  });

  it('includes symbol target identity for non-call relations when present', () => {
    expect(
      getRelationKey({
        kind: 'import',
        sourceId: 'import:lib',
        fromFilePath: 'src/app.ts',
        specifier: './lib',
        toFilePath: 'src/lib.ts',
        toSymbolId: 'src/lib.ts:function:boot',
      } as never),
    ).toBe('import|import:lib|src/app.ts|||./lib||||src/lib.ts:function:boot');
  });

  it('omits file-only target differences for non-call relations', () => {
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

  it('uses pipe separators between every serialized relation segment', () => {
    expect(
      getRelationKey({
        kind: 'call',
        sourceId: 'call:run',
        fromFilePath: 'src/app.ts',
        toFilePath: 'src/lib.ts',
      } as never),
    ).toContain('|');
    expect(
      getRelationKey({
        kind: 'call',
        sourceId: 'call:run',
        fromFilePath: 'src/app.ts',
        toFilePath: 'src/lib.ts',
      } as never).split('|'),
    ).toHaveLength(12);
    expect(
      getRelationKey({
        kind: 'import',
        sourceId: 'import:run',
        fromFilePath: 'src/app.ts',
        toFilePath: 'src/lib.ts',
      } as never).split('|'),
    ).toHaveLength(8);
  });
});
