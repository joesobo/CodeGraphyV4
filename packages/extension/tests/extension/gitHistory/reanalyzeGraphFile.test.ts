import { describe, expect, it, vi } from 'vitest';
import type { IFileAnalysisResult } from '../../../src/core/plugins/types/contracts';
import type { IGraphEdge } from '../../../src/shared/graph/contracts';
import {
  reanalyzeGraphFile,
  removeOutgoingGitHistoryEdges,
} from '../../../src/extension/gitHistory/reanalyzeGraphFile';

describe('gitHistory/reanalyzeGraphFile', () => {
  const emptyAnalysis = (filePath: string): IFileAnalysisResult => ({ filePath, relations: [] });

  it('returns early for unsupported files', async () => {
    const getFileAtCommit = vi.fn(async () => '');
    const registry = {
      analyzeFileResult: vi.fn(async (absolutePath: string): Promise<IFileAnalysisResult> => emptyAnalysis(absolutePath)),
      supportsFile: vi.fn(() => false),
    };
    const edges: IGraphEdge[] = [{ id: 'src/a.txt->src/b.txt#import', from: 'src/a.txt', to: 'src/b.txt' , kind: 'import', sources: [] }];
    const edgeSet = new Set(['src/a.txt->src/b.txt#import']);
    const nodes = [{ id: 'src/a.txt', label: 'a.txt', color: '#CBD5E1' }];
    const nodeMap = new Map([[nodes[0].id, nodes[0]]]);

    await reanalyzeGraphFile({
      edgeSet,
      edges,
      filePath: 'src/a.txt',
      getFileAtCommit,
      nodeMap,
      nodes,
      registry,
      sha: 'abc123',
      signal: new AbortController().signal,
      workspaceRoot: '/workspace',
    });

    expect(getFileAtCommit).not.toHaveBeenCalled();
    expect(registry.analyzeFileResult).not.toHaveBeenCalled();
    expect(nodes).toEqual([{ id: 'src/a.txt', label: 'a.txt', color: '#CBD5E1' }]);
    expect(edges).toEqual([{ id: 'src/a.txt->src/b.txt#import', from: 'src/a.txt', to: 'src/b.txt' , kind: 'import', sources: [] }]);
  });

  it('adds missing nodes and plugin-qualified edges during reanalysis', async () => {
    const edges: IGraphEdge[] = [];
    const nodeMap = new Map();
    const nodes: Array<{ id: string; label: string; color: string }> = [];
    const registry = {
      analyzeFileResult: vi.fn(async (absolutePath: string): Promise<IFileAnalysisResult> => ({
        filePath: absolutePath,
        relations: [
          {
            sourceId: 'import',
            specifier: './b',
            type: 'static',
            resolvedPath: '/workspace/src/b.ts',
            kind: 'import',
            pluginId: 'ts',
            fromFilePath: absolutePath,
          },
        ],
      })),
      supportsFile: vi.fn(() => true),
    };

    await reanalyzeGraphFile({
      edgeSet: new Set(),
      edges,
      filePath: 'src/a.ts',
      getFileAtCommit: vi.fn(async () => 'import "./b";'),
      nodeMap,
      nodes,
      registry,
      sha: 'abc123',
      signal: new AbortController().signal,
      workspaceRoot: '/workspace',
    });

    expect(nodes).toEqual([{ id: 'src/a.ts', label: 'a.ts', color: '#93C5FD' }]);
    expect(edges).toEqual([
      {
        id: 'src/a.ts->src/b.ts#import:static',
        from: 'src/a.ts',
        to: 'src/b.ts',
        kind: 'import',
        sources: [
          {
            id: 'ts:import',
            pluginId: 'ts',
            sourceId: 'import',
            label: 'import',
          },
        ],
      },
    ]);
  });

  it('keeps plain edges when no plugin id is available', async () => {
    const edges: IGraphEdge[] = [];
    const edgeSet = new Set<string>();
    const getFileAtCommit = vi.fn(async () => 'import "./b";');
    const registry = {
      analyzeFileResult: vi.fn(async (absolutePath: string): Promise<IFileAnalysisResult> => ({
        filePath: absolutePath,
        relations: [
          {
            sourceId: 'import',
            specifier: './b',
            type: 'static',
            resolvedPath: '/workspace/src/b.ts',
            kind: 'import',
            fromFilePath: absolutePath,
          },
        ],
      })),
      supportsFile: vi.fn(() => true),
    };

    await reanalyzeGraphFile({
      edgeSet,
      edges,
      filePath: 'src/a.ts',
      getFileAtCommit,
      nodeMap: new Map(),
      nodes: [],
      registry,
      sha: 'abc123',
      signal: new AbortController().signal,
      workspaceRoot: '/workspace',
    });

    expect(getFileAtCommit).toHaveBeenCalled();
    expect(edges).toEqual([
      {
        id: 'src/a.ts->src/b.ts#import:static',
        from: 'src/a.ts',
        to: 'src/b.ts',
        kind: 'import',
        sources: [],
      },
    ]);
  });

  it('does not duplicate an existing node during reanalysis', async () => {
    const existingNode = { id: 'src/a.ts', label: 'a.ts', color: '#93C5FD' };
    const nodes = [existingNode];
    const nodeMap = new Map([[existingNode.id, existingNode]]);

    await reanalyzeGraphFile({
      edgeSet: new Set(),
      edges: [],
      filePath: 'src/a.ts',
      getFileAtCommit: vi.fn(async () => ''),
      nodeMap,
      nodes,
      registry: {
        analyzeFileResult: vi.fn(async (absolutePath: string): Promise<IFileAnalysisResult> => emptyAnalysis(absolutePath)),
        supportsFile: vi.fn(() => true),
      },
      sha: 'abc123',
      signal: new AbortController().signal,
      workspaceRoot: '/workspace',
    });

    expect(nodes).toEqual([existingNode]);
  });

  it('removes only outgoing edges from the requested file', () => {
    const edges: IGraphEdge[] = [
      { id: 'src/a.ts->src/b.ts#import', from: 'src/a.ts', to: 'src/b.ts' , kind: 'import', sources: [] },
      { id: 'src/c.ts->src/a.ts#import', from: 'src/c.ts', to: 'src/a.ts' , kind: 'import', sources: [] },
    ];
    const edgeSet = new Set(edges.map((edge) => edge.id));

    removeOutgoingGitHistoryEdges('src/a.ts', edges, edgeSet);

    expect(edges).toEqual([{ id: 'src/c.ts->src/a.ts#import', from: 'src/c.ts', to: 'src/a.ts' , kind: 'import', sources: [] }]);
    expect(edgeSet).toEqual(new Set(['src/c.ts->src/a.ts#import']));
  });
});
