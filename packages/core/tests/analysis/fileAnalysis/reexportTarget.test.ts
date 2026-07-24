import { describe, expect, it } from 'vitest';
import type {
  IAnalysisRelation,
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

function relation(overrides: Partial<IAnalysisRelation>): IAnalysisRelation {
  return {
    fromFilePath: '/workspace/src/source.ts',
    kind: 'import',
    sourceId: 'test-source',
    toFilePath: '/workspace/src/target.ts',
    ...overrides,
  };
}

function analysis(
  filePath: string,
  values: Partial<IFileAnalysisResult>,
): IFileAnalysisResult {
  return { filePath, ...values };
}

function caller(importedName: string): IFileAnalysisResult {
  return analysis('/workspace/src/caller.ts', {
    relations: [relation({
      kind: 'call',
      toFilePath: '/workspace/src/barrel.ts',
      metadata: { importedName },
    })],
  });
}

function expectCallerTarget(
  result: ReadonlyMap<string, IFileAnalysisResult>,
  filePath: string,
  symbolId: string,
): void {
  expect(result.get('src/caller.ts')?.relations?.[0]).toEqual(
    expect.objectContaining({ toFilePath: filePath, toSymbolId: symbolId }),
  );
}

describe('pipeline/fileAnalysis/reexportTarget', () => {
  it('resolves named calls through a star re-export without redirecting lexical imports', () => {
    const source = caller('readSetting');
    source.relations?.push(relation({
      kind: 'import',
      toFilePath: '/workspace/src/barrel.ts',
      metadata: { importedName: 'readSetting' },
    }));
    const result = enrichWorkspaceFileAnalysis(new Map([
      ['src/caller.ts', source],
      ['src/barrel.ts', analysis('/workspace/src/barrel.ts', {
        relations: [relation({
          fromFilePath: '/workspace/src/barrel.ts',
          toFilePath: '/workspace/src/storage.ts',
          metadata: { reexportAll: true },
        })],
      })],
      ['src/storage.ts', analysis('/workspace/src/storage.ts', {
        symbols: [
          symbol('/workspace/src/storage.ts', 'readSetting'),
          symbol('/workspace/src/storage.ts', 'writeSetting'),
        ],
      })],
    ]));

    expect(result.get('src/caller.ts')?.relations).toEqual([
      expect.objectContaining({
        toFilePath: '/workspace/src/storage.ts',
        toSymbolId: '/workspace/src/storage.ts:readSetting',
      }),
      expect.objectContaining({ toFilePath: '/workspace/src/barrel.ts' }),
    ]);
  });

  it('reuses persisted re-export Symbol edges without analyzer metadata', () => {
    const result = enrichWorkspaceFileAnalysis(new Map([
      ['src/caller.ts', caller('readSetting')],
      ['src/barrel.ts', analysis('/workspace/src/barrel.ts', {
        relations: [relation({
          kind: 'reexport',
          fromFilePath: '/workspace/src/barrel.ts',
          toFilePath: '/workspace/src/storage.ts',
          toSymbolId: '/workspace/src/storage.ts:readSetting',
        })],
      })],
      ['src/storage.ts', analysis('/workspace/src/storage.ts', {
        symbols: [symbol('/workspace/src/storage.ts', 'readSetting')],
      })],
    ]));

    expectCallerTarget(
      result,
      '/workspace/src/storage.ts',
      '/workspace/src/storage.ts:readSetting',
    );
  });

  it('reuses persisted file-level re-export edges as export-star traversal', () => {
    const result = enrichWorkspaceFileAnalysis(new Map([
      ['src/caller.ts', caller('readSetting')],
      ['src/barrel.ts', analysis('/workspace/src/barrel.ts', {
        relations: [relation({
          kind: 'reexport',
          fromFilePath: '/workspace/src/barrel.ts',
          toFilePath: '/workspace/src/storage.ts',
        })],
      })],
      ['src/storage.ts', analysis('/workspace/src/storage.ts', {
        symbols: [
          symbol('/workspace/src/storage.ts', 'readSetting'),
          symbol('/workspace/src/storage.ts', 'writeSetting'),
        ],
      })],
    ]));

    expectCallerTarget(
      result,
      '/workspace/src/storage.ts',
      '/workspace/src/storage.ts:readSetting',
    );
  });

  it('follows a persisted re-export alias to its implementation Symbol', () => {
    const alias = {
      ...symbol('/workspace/src/barrel.ts', 'publicRead'),
      id: '/workspace/src/barrel.ts:publicRead:alias',
      kind: 'alias',
    };
    const result = enrichWorkspaceFileAnalysis(new Map([
      ['src/caller.ts', caller('publicRead')],
      ['src/barrel.ts', analysis('/workspace/src/barrel.ts', {
        symbols: [alias],
        relations: [relation({
          kind: 'reexport',
          fromFilePath: '/workspace/src/barrel.ts',
          fromSymbolId: alias.id,
          toFilePath: '/workspace/src/storage.ts',
          toSymbolId: '/workspace/src/storage.ts:internalRead',
        })],
      })],
      ['src/storage.ts', analysis('/workspace/src/storage.ts', {
        symbols: [symbol('/workspace/src/storage.ts', 'internalRead')],
      })],
    ]));

    expectCallerTarget(
      result,
      '/workspace/src/storage.ts',
      '/workspace/src/storage.ts:internalRead',
    );
  });

  it('resolves an aliased named re-export without following unrelated exports', () => {
    const result = enrichWorkspaceFileAnalysis(new Map([
      ['src/caller.ts', caller('publicRead')],
      ['src/barrel.ts', analysis('/workspace/src/barrel.ts', {
        relations: [
          relation({
            fromFilePath: '/workspace/src/barrel.ts',
            toFilePath: '/workspace/src/storage.ts',
            metadata: {
              reexport: true,
              exportedName: 'publicRead',
              importedName: 'internalRead',
            },
          }),
          relation({
            fromFilePath: '/workspace/src/barrel.ts',
            toFilePath: '/workspace/src/other.ts',
            metadata: {
              reexport: true,
              exportedName: 'other',
              importedName: 'other',
            },
          }),
        ],
      })],
      ['src/storage.ts', analysis('/workspace/src/storage.ts', {
        symbols: [symbol('/workspace/src/storage.ts', 'internalRead')],
      })],
      ['src/other.ts', analysis('/workspace/src/other.ts', {
        symbols: [symbol('/workspace/src/other.ts', 'other')],
      })],
    ]));

    expectCallerTarget(
      result,
      '/workspace/src/storage.ts',
      '/workspace/src/storage.ts:internalRead',
    );
  });
});
