import { describe, expect, it } from 'vitest';
import type {
  IAnalysisRelationshipEvidence,
  IAnalysisSymbol,
} from '@codegraphy-dev/plugin-api';
import { enrichRelationTargetSymbol } from '../../../src/analysis/fileAnalysis/targetSymbol';

function symbol(filePath: string, name: string): IAnalysisSymbol {
  return {
    filePath,
    id: `${filePath}:${name}`,
    kind: 'function',
    name,
  };
}

function relation(overrides: Partial<IAnalysisRelationshipEvidence>): IAnalysisRelationshipEvidence {
  return {
    edgeType: 'import',
    from: { kind: 'file', filePath: '/workspace/src/source.ts' },
    sourceId: 'test-source',
    target: { kind: 'file', path: '/workspace/src/target.ts', pathKind: 'absolute' },
    ...overrides,
  };
}

describe('pipeline/fileAnalysis/targetSymbol', () => {
  it('keeps relations that already have a target symbol id', () => {
    const existing = relation({
      target: {
        kind: 'symbol',
        filePath: '/workspace/src/target.ts',
        symbolId: 'existing-symbol',
      },
    });

    expect(enrichRelationTargetSymbol(existing, new Map([
      ['/workspace/src/target.ts', [symbol('/workspace/src/target.ts', 'target')]],
    ]), '/workspace')).toEqual(existing);
  });

  it('keeps relations without a target file or target symbols unchanged', () => {
    const withoutFile = relation({ target: { kind: 'unresolved', specifier: './target' } });
    const withoutSymbols = relation({ metadata: { importedName: 'target' } });

    expect(enrichRelationTargetSymbol(withoutFile, new Map(), '/workspace')).toEqual(withoutFile);
    expect(enrichRelationTargetSymbol(withoutSymbols, new Map([
      ['/workspace/src/target.ts', []],
    ]), '/workspace')).toEqual(withoutSymbols);
  });

  it('adds the resolved target symbol id when a matching target symbol exists', () => {
    expect(enrichRelationTargetSymbol(
      relation({ metadata: { importedName: 'target' } }),
      new Map([
        ['/workspace/src/target.ts', [symbol('/workspace/src/target.ts', 'target')]],
      ]),
      '/workspace',
    )).toEqual(expect.objectContaining({
      target: {
        kind: 'symbol',
        filePath: '/workspace/src/target.ts',
        symbolId: '/workspace/src/target.ts:target',
        specifier: undefined,
      },
    }));
  });
});
