import { describe, expect, it } from 'vitest';
import { getRelationKey } from '@codegraphy-dev/core';
import type { IAnalysisRelationshipEvidence } from '../../../../../../plugin-api/src';

function relation(overrides: Partial<IAnalysisRelationshipEvidence> = {}): IAnalysisRelationshipEvidence {
  return {
    edgeType: 'import',
    sourceId: 'import:lib',
    from: { kind: 'file', filePath: 'src/app.ts' },
    target: { kind: 'unresolved', specifier: '' },
    ...overrides,
  };
}

describe('routing/results/keys', () => {
  it('serializes every base relation field in order and uses empty placeholders for missing optionals', () => {
    expect(getRelationKey('src/app.ts', relation())).toBe('import|import:lib|src/app.ts|||||');

    expect(getRelationKey('src/app.ts', relation({
      from: { kind: 'symbol', symbolId: 'symbol-a', filePath: 'src/app.ts' },
      specifier: './lib',
      timing: 'value',
      variant: 'static',
    }))).toBe('import|import:lib|src/app.ts||symbol-a|./lib|value|static');
  });

  it('includes resolved target fields for call-like relations', () => {
    const baseRelation = relation({
      edgeType: 'call',
      sourceId: 'call:run',
      from: { kind: 'symbol', symbolId: 'src/app.ts:function:run', filePath: 'src/app.ts' },
      specifier: './lib',
    });

    expect(getRelationKey('src/app.ts', { ...baseRelation, target: { kind: 'file', path: 'src/a.ts' } })).not.toEqual(
      getRelationKey('src/app.ts', { ...baseRelation, target: { kind: 'file', path: 'src/b.ts' } }),
    );
  });

  it('includes every resolved target field for call and reference relations', () => {
    expect(getRelationKey('src/app.ts', relation({
      edgeType: 'call',
      sourceId: 'call:run',
      from: { kind: 'symbol', symbolId: 'caller-symbol', filePath: 'src/app.ts' },
      specifier: './lib',
      timing: 'value',
      variant: 'static',
      target: { kind: 'symbol', symbolId: 'callee-symbol', filePath: '/workspace/src/lib.ts', specifier: './lib' },
    }))).toBe('call|call:run|src/app.ts||caller-symbol|./lib|value|static|/workspace/src/lib.ts||callee-symbol');

    expect(getRelationKey('src/app.ts', relation({
      edgeType: 'reference',
      sourceId: 'reference:run',
      target: { kind: 'file', path: 'src/lib.ts' },
    }))).toBe('reference|reference:run|src/app.ts||||||src/lib.ts||');
  });

  it('includes symbol target identity for non-call relations when present', () => {
    expect(getRelationKey('src/app.ts', relation({
      specifier: './lib',
      target: { kind: 'symbol', symbolId: 'src/lib.ts:function:boot', filePath: 'src/lib.ts', specifier: './lib' },
    }))).toBe('import|import:lib|src/app.ts|||./lib||||src/lib.ts:function:boot');
  });

  it('omits file-only target differences for non-call relations', () => {
    const baseRelation = relation({ specifier: './lib' });

    expect(getRelationKey('src/app.ts', { ...baseRelation, target: { kind: 'file', path: 'src/a.ts' } })).toEqual(
      getRelationKey('src/app.ts', { ...baseRelation, target: { kind: 'file', path: 'src/b.ts' } }),
    );
  });

  it('uses pipe separators between every serialized relation segment', () => {
    expect(getRelationKey('src/app.ts', relation({
      edgeType: 'call',
      sourceId: 'call:run',
      target: { kind: 'file', path: 'src/lib.ts' },
    }))).toContain('|');
    expect(getRelationKey('src/app.ts', relation({
      edgeType: 'call',
      sourceId: 'call:run',
      target: { kind: 'file', path: 'src/lib.ts' },
    })).split('|')).toHaveLength(11);
    expect(getRelationKey('src/app.ts', relation({
      sourceId: 'import:run',
      target: { kind: 'file', path: 'src/lib.ts' },
    })).split('|')).toHaveLength(8);
  });
});
