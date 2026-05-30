import { describe, expect, it } from 'vitest';
import type {
  IAnalysisRelationshipEvidence,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '@codegraphy-dev/plugin-api';
import { enrichWorkspaceFileAnalysis } from '../../../src/analysis/fileAnalysis/enrichment';

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

function analysis(
  filePath: string,
  values: Partial<IFileAnalysisResult>,
): IFileAnalysisResult {
  return {
    filePath,
    ...values,
  };
}

describe('pipeline/fileAnalysis/enrichment', () => {
  it('resolves a relation to the unique target symbol when no name metadata exists', () => {
    const result = enrichWorkspaceFileAnalysis(new Map([
      ['/workspace/src/source.ts', analysis('/workspace/src/source.ts', {
        relations: [relation({})],
      })],
      ['/workspace/src/target.ts', analysis('/workspace/src/target.ts', {
        symbols: [symbol('/workspace/src/target.ts', 'target')],
      })],
    ]), '/workspace');

    expect(result.get('/workspace/src/source.ts')?.relations?.[0]).toEqual(
      expect.objectContaining({
        target: {
          kind: 'symbol',
          filePath: '/workspace/src/target.ts',
          symbolId: '/workspace/src/target.ts:target',
          specifier: undefined,
        },
      }),
    );
  });

  it('does not guess a symbol when unnamed relations target multiple symbols', () => {
    const result = enrichWorkspaceFileAnalysis(new Map([
      ['/workspace/src/source.ts', analysis('/workspace/src/source.ts', {
        relations: [relation({})],
      })],
      ['/workspace/src/target.ts', analysis('/workspace/src/target.ts', {
        symbols: [
          symbol('/workspace/src/target.ts', 'first'),
          symbol('/workspace/src/target.ts', 'second'),
        ],
      })],
    ]), '/workspace');

    expect(result.get('/workspace/src/source.ts')?.relations?.[0]?.target.kind).toBe('file');
  });

  it('prefers member names over imported names when both are present', () => {
    const result = enrichWorkspaceFileAnalysis(new Map([
      ['/workspace/src/source.ts', analysis('/workspace/src/source.ts', {
        relations: [relation({
          metadata: {
            importedName: 'wrong',
            memberName: 'right',
          },
        })],
      })],
      ['/workspace/src/target.ts', analysis('/workspace/src/target.ts', {
        symbols: [
          symbol('/workspace/src/target.ts', 'wrong'),
          symbol('/workspace/src/target.ts', 'right'),
        ],
      })],
    ]), '/workspace');

    expect(result.get('/workspace/src/source.ts')?.relations?.[0]).toEqual(
      expect.objectContaining({
        target: {
          kind: 'symbol',
          filePath: '/workspace/src/target.ts',
          symbolId: '/workspace/src/target.ts:right',
          specifier: undefined,
        },
      }),
    );
  });

  it('does not resolve namespace or default imports by symbol name', () => {
    const result = enrichWorkspaceFileAnalysis(new Map([
      ['/workspace/src/source.ts', analysis('/workspace/src/source.ts', {
        relations: [
          relation({ metadata: { importedName: '*' } }),
          relation({ metadata: { importedName: 'default' } }),
        ],
      })],
      ['/workspace/src/target.ts', analysis('/workspace/src/target.ts', {
        symbols: [
          symbol('/workspace/src/target.ts', '*'),
          symbol('/workspace/src/target.ts', 'default'),
          symbol('/workspace/src/target.ts', 'named'),
        ],
      })],
    ]), '/workspace');

    expect(result.get('/workspace/src/source.ts')?.relations).toEqual([
      expect.objectContaining({ target: expect.objectContaining({ kind: 'file' }) }),
      expect.objectContaining({ target: expect.objectContaining({ kind: 'file' }) }),
    ]);
  });

  it('keeps existing target symbol ids and handles analysis without relations', () => {
    const existingRelation = relation({
      target: {
        kind: 'symbol',
        filePath: '/workspace/src/target.ts',
        symbolId: 'existing-symbol',
      },
    });
    const result = enrichWorkspaceFileAnalysis(new Map([
      ['/workspace/src/source.ts', analysis('/workspace/src/source.ts', {
        relations: [existingRelation],
      })],
      ['/workspace/src/target.ts', analysis('/workspace/src/target.ts', {
        symbols: [symbol('/workspace/src/target.ts', 'target')],
      })],
      ['/workspace/src/empty.ts', analysis('/workspace/src/empty.ts', {
        symbols: [symbol('/workspace/src/empty.ts', 'unused')],
      })],
    ]), '/workspace');

    expect(result.get('/workspace/src/source.ts')?.relations?.[0]).toEqual(existingRelation);
    expect(result.get('/workspace/src/empty.ts')?.relations).toEqual([]);
  });
});
