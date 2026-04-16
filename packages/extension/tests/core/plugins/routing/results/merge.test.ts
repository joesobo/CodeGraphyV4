import { describe, expect, it } from 'vitest';
import type { IFileAnalysisResult } from '../../../../../src/core/plugins/types/contracts';
import {
  createEmptyFileAnalysisResult,
  mergeById,
  mergeFileAnalysisResults,
  mergeRelations,
} from '../../../../../src/core/plugins/routing/router/results/merge';

describe('routing/results/merge', () => {
  it('builds an empty analysis result for a file path', () => {
    expect(createEmptyFileAnalysisResult('src/app.ts')).toEqual({
      filePath: 'src/app.ts',
      edgeTypes: [],
      nodeTypes: [],
      nodes: [],
      relations: [],
      symbols: [],
    });
  });

  it('prefers later items when merging lists by id', () => {
    expect(
      mergeById(
        [{ id: 'file', label: 'File', defaultColor: '#aaa', defaultVisible: true }],
        [{ id: 'file', label: 'Updated', defaultColor: '#bbb', defaultVisible: false }],
      ),
    ).toEqual([{ id: 'file', label: 'Updated', defaultColor: '#bbb', defaultVisible: false }]);
  });

  it('deduplicates relations by the routed relation key', () => {
    expect(
      mergeRelations(
        [{
          kind: 'call',
          sourceId: 'call:run',
          fromFilePath: 'src/app.ts',
          fromSymbolId: 'src/app.ts:function:run',
          toFilePath: 'src/a.ts',
        }],
        [{
          kind: 'call',
          sourceId: 'call:run',
          fromFilePath: 'src/app.ts',
          fromSymbolId: 'src/app.ts:function:run',
          toFilePath: 'src/a.ts',
          metadata: { updated: true },
        }],
      ),
    ).toEqual([{
      kind: 'call',
      sourceId: 'call:run',
      fromFilePath: 'src/app.ts',
      fromSymbolId: 'src/app.ts:function:run',
      toFilePath: 'src/a.ts',
      metadata: { updated: true },
    }]);
  });

  it('merges analysis results field by field', () => {
    const baseResult = createEmptyFileAnalysisResult('src/base.ts');
    const nextResult: IFileAnalysisResult = {
      filePath: 'src/next.ts',
      edgeTypes: [{ id: 'import', label: 'Import', defaultColor: '#38BDF8', defaultVisible: true }],
      nodeTypes: [{ id: 'file', label: 'File', defaultColor: '#A1A1AA', defaultVisible: true }],
      nodes: [{ id: 'src/app.ts', nodeType: 'file', label: 'app.ts' }],
      relations: [{
        kind: 'import' as const,
        sourceId: 'import:lib',
        fromFilePath: 'src/app.ts',
        toFilePath: 'src/lib.ts',
      }],
      symbols: [{
        id: 'src/app.ts:function:run',
        name: 'run',
        kind: 'function' as const,
        filePath: 'src/app.ts',
      }],
    };

    expect(mergeFileAnalysisResults(baseResult, nextResult)).toEqual(nextResult);
  });
});
