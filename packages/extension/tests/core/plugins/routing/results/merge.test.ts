import { describe, expect, it } from 'vitest';
import type { IAnalysisRelationshipEvidence, IFileAnalysisResult } from '../../../../../../plugin-api/src';
import {
  createEmptyFileAnalysisResult,
  mergeById,
  mergeFileAnalysisResults,
  mergeRelations,
} from '@codegraphy-dev/core';

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

  it('keeps base items when no later items are provided', () => {
    expect(
      mergeById(
        [{ id: 'file', label: 'File', defaultColor: '#aaa', defaultVisible: true }],
        undefined,
      ),
    ).toEqual([{ id: 'file', label: 'File', defaultColor: '#aaa', defaultVisible: true }]);
  });

  it('treats missing item arrays as empty lists', () => {
    expect(mergeById(undefined, undefined)).toEqual([]);
    expect(
      mergeById(undefined, [
        { id: 'file', label: 'File', defaultColor: '#aaa', defaultVisible: true },
      ]),
    ).toEqual([{ id: 'file', label: 'File', defaultColor: '#aaa', defaultVisible: true }]);
  });

  it('deduplicates relations by the routed relation key', () => {
    const baseRelation: IAnalysisRelationshipEvidence = {
      edgeType: 'call',
      sourceId: 'call:run',
      from: { kind: 'symbol', symbolId: 'src/app.ts:function:run', filePath: 'src/app.ts' },
      target: { kind: 'file', path: 'src/a.ts' },
    };

    expect(
      mergeRelations(
        'src/app.ts',
        [baseRelation],
        [{ ...baseRelation, metadata: { updated: true } }],
      ),
    ).toEqual([{ ...baseRelation, metadata: { updated: true } }]);
  });

  it('keeps base relations when no later relations are provided', () => {
    const baseRelation: IAnalysisRelationshipEvidence = {
      edgeType: 'call',
      sourceId: 'call:run',
      from: { kind: 'symbol', symbolId: 'src/app.ts:function:run', filePath: 'src/app.ts' },
      target: { kind: 'file', path: 'src/a.ts' },
    };

    expect(
      mergeRelations(
        'src/app.ts',
        [baseRelation],
        undefined,
      ),
    ).toEqual([baseRelation]);
  });

  it('keeps distinct import relations when only the target symbol differs', () => {
    const bootRelation: IAnalysisRelationshipEvidence = {
      edgeType: 'import',
      sourceId: 'import:lib',
      from: { kind: 'file', filePath: 'src/app.ts' },
      specifier: './lib',
      target: { kind: 'symbol', symbolId: 'src/lib.ts:function:boot', filePath: 'src/lib.ts', specifier: './lib' },
    };
    const shutdownRelation: IAnalysisRelationshipEvidence = {
      ...bootRelation,
      target: { kind: 'symbol', symbolId: 'src/lib.ts:function:shutdown', filePath: 'src/lib.ts', specifier: './lib' },
    };

    expect(
      mergeRelations(
        'src/app.ts',
        [bootRelation],
        [shutdownRelation],
      ),
    ).toEqual([bootRelation, shutdownRelation]);
  });

  it('treats missing relation arrays as empty lists', () => {
    expect(mergeRelations('src/app.ts', undefined, undefined)).toEqual([]);
  });

  it('merges analysis results field by field', () => {
    const baseResult = createEmptyFileAnalysisResult('src/base.ts');
    const nextResult: IFileAnalysisResult = {
      filePath: 'src/next.ts',
      edgeTypes: [{ id: 'import', label: 'Import', defaultColor: '#38BDF8', defaultVisible: true }],
      nodeTypes: [{ id: 'file', label: 'File', defaultColor: '#A1A1AA', defaultVisible: true }],
      nodes: [{ id: 'src/app.ts', nodeType: 'file', label: 'app.ts' }],
      relations: [{
        edgeType: 'import' as const,
        sourceId: 'import:lib',
        from: { kind: 'file', filePath: 'src/app.ts' },
        target: { kind: 'file', path: 'src/lib.ts' },
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

  it('keeps the base file path when the next result omits it', () => {
    expect(
      mergeFileAnalysisResults(
        {
          ...createEmptyFileAnalysisResult('src/base.ts'),
          nodeTypes: [{ id: 'file', label: 'File', defaultColor: '#A1A1AA', defaultVisible: true }],
        },
        {
          ...createEmptyFileAnalysisResult(''),
          nodeTypes: [],
        },
      ),
    ).toEqual({
      filePath: 'src/base.ts',
      edgeTypes: [],
      nodeTypes: [{ id: 'file', label: 'File', defaultColor: '#A1A1AA', defaultVisible: true }],
      nodes: [],
      relations: [],
      symbols: [],
    });
  });
});
