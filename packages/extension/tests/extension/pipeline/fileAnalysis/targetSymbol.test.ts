import { describe, expect, it } from 'vitest';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
} from '../../../../src/core/plugins/types/contracts';
import { enrichRelationTargetSymbol } from '../../../../src/extension/pipeline/fileAnalysis/targetSymbol';

function symbol(filePath: string, name: string): IAnalysisSymbol {
  return {
    filePath,
    id: `${filePath}:${name}`,
    kind: 'function',
    name,
  };
}

function relation(overrides: Partial<IAnalysisRelation>): IAnalysisRelation {
  return {
    fromFilePath: '/workspace/src/source.ts',
    kind: 'import',
    sourceId: 'test-source',
    toFilePath: '/workspace/src/target.ts',
    ...overrides,
  };
}

describe('pipeline/fileAnalysis/targetSymbol', () => {
  it('keeps relations that already have a target symbol id', () => {
    const existing = relation({ toSymbolId: 'existing-symbol' });

    expect(enrichRelationTargetSymbol(existing, new Map([
      ['/workspace/src/target.ts', [symbol('/workspace/src/target.ts', 'target')]],
    ]))).toEqual(existing);
  });

  it('keeps relations without a target file or target symbols unchanged', () => {
    const withoutFile = relation({ toFilePath: undefined });
    const withoutSymbols = relation({ metadata: { importedName: 'target' } });

    expect(enrichRelationTargetSymbol(withoutFile, new Map())).toEqual(withoutFile);
    expect(enrichRelationTargetSymbol(withoutSymbols, new Map([
      ['/workspace/src/target.ts', []],
    ]))).toEqual(withoutSymbols);
  });

  it('adds the resolved target symbol id when a matching target symbol exists', () => {
    expect(enrichRelationTargetSymbol(
      relation({ metadata: { importedName: 'target' } }),
      new Map([
        ['/workspace/src/target.ts', [symbol('/workspace/src/target.ts', 'target')]],
      ]),
    )).toEqual(expect.objectContaining({
      toSymbolId: '/workspace/src/target.ts:target',
    }));
  });
});
