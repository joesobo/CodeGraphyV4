import { describe, expect, it, vi } from 'vitest';
import type { IFileAnalysisResult } from '../../../../src/core/plugins/types/contracts';
import type { IGraphEdge } from '../../../../src/shared/graph/contracts';
import {
  addGitHistoryGraphFile,
  modifyGitHistoryGraphFile,
} from '../../../../src/extension/gitHistory/diff/changes';

describe('gitHistory/diff/changes', () => {
  const emptyAnalysis = (filePath: string): IFileAnalysisResult => ({ filePath, relations: [] });

  it('skips unsupported files instead of adding timeline-only nodes', async () => {
    const nodes: Array<{ id: string; label: string; color: string }> = [];
    const nodeMap = new Map();
    const registry = {
      analyzeFileResult: vi.fn(async (absolutePath: string): Promise<IFileAnalysisResult> => emptyAnalysis(absolutePath)),
      supportsFile: vi.fn(() => false),
    };

    await addGitHistoryGraphFile({
      edgeSet: new Set(),
      edges: [],
      filePath: 'src/readme.md',
      getFileAtCommit: vi.fn(async () => ''),
      nodeMap,
      nodes,
      registry,
      sha: 'abc123',
      signal: new AbortController().signal,
      workspaceRoot: '/workspace',
    });

    expect(nodes).toEqual([]);
    expect(registry.analyzeFileResult).not.toHaveBeenCalled();
  });

  it('adds supported files by fetching content and appending analyzed edges', async () => {
    const edges: Array<{ id: string; from: string; to: string; kind: 'import'; sources: { id: string; pluginId: string; sourceId: string; label: string }[] }> = [];
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
    const signal = new AbortController().signal;
    const nodes: Array<{ id: string; label: string; color: string }> = [];
    const nodeMap = new Map();

    await addGitHistoryGraphFile({
      edgeSet,
      edges,
      filePath: 'src/a.ts',
      getFileAtCommit,
      nodeMap,
      nodes,
      registry,
      sha: 'abc123',
      signal,
      workspaceRoot: '/workspace',
    });

    expect(getFileAtCommit).toHaveBeenCalledWith('abc123', 'src/a.ts', signal);
    expect(registry.analyzeFileResult).toHaveBeenCalledWith(
      '/workspace/src/a.ts',
      'import "./b";',
      '/workspace',
      undefined,
    );
    expect(nodes).toEqual([{ id: 'src/a.ts', label: 'a.ts', color: '#93C5FD' }]);
    expect(edges).toEqual([
      {
        id: 'src/a.ts->src/b.ts#import:static',
        from: 'src/a.ts',
        to: 'src/b.ts',
        kind: 'import',
        sources: [],
      },
    ]);
    expect(edgeSet).toEqual(new Set(['src/a.ts->src/b.ts#import:static']));
  });

  it('reuses an existing supported node while reanalyzing its edges', async () => {
    const existingNode = { id: 'src/a.ts', label: 'a.ts', color: '#93C5FD' };
    const nodes = [existingNode];
    const nodeMap = new Map([[existingNode.id, existingNode]]);
    const edges: Array<{ id: string; from: string; to: string; kind: 'import'; sources: { id: string; pluginId: string; sourceId: string; label: string }[] }> = [];
    const edgeSet = new Set<string>();
    const getFileAtCommit = vi.fn(async () => 'import "./c";');
    const registry = {
      analyzeFileResult: vi.fn(async (absolutePath: string): Promise<IFileAnalysisResult> => ({
        filePath: absolutePath,
        relations: [
          {
            sourceId: 'import',
            specifier: './c',
            type: 'static',
            resolvedPath: '/workspace/src/c.ts',
            kind: 'import',
            fromFilePath: absolutePath,
          },
        ],
      })),
      supportsFile: vi.fn(() => true),
    };
    const signal = new AbortController().signal;

    await addGitHistoryGraphFile({
      edgeSet,
      edges,
      filePath: existingNode.id,
      getFileAtCommit,
      nodeMap,
      nodes,
      registry,
      sha: 'abc123',
      signal,
      workspaceRoot: '/workspace',
    });

    expect(getFileAtCommit).toHaveBeenCalledWith('abc123', existingNode.id, signal);
    expect(registry.analyzeFileResult).toHaveBeenCalledWith(
      '/workspace/src/a.ts',
      'import "./c";',
      '/workspace',
      undefined,
    );
    expect(nodes).toEqual([existingNode]);
    expect(nodeMap.get(existingNode.id)).toBe(existingNode);
    expect(edges).toEqual([
      {
        id: 'src/a.ts->src/c.ts#import:static',
        from: 'src/a.ts',
        to: 'src/c.ts',
        kind: 'import',
        sources: [],
      },
    ]);
    expect(edgeSet).toEqual(new Set(['src/a.ts->src/c.ts#import:static']));
  });

  it('leaves existing unsupported nodes untouched during replay', async () => {
    const existingNode = { id: 'src/readme.md', label: 'readme.md', color: '#CBD5E1' };
    const nodes = [existingNode];
    const nodeMap = new Map([[existingNode.id, existingNode]]);

    await addGitHistoryGraphFile({
      edgeSet: new Set(),
      edges: [],
      filePath: 'src/readme.md',
      getFileAtCommit: vi.fn(async () => ''),
      nodeMap,
      nodes,
      registry: {
        analyzeFileResult: vi.fn(async (absolutePath: string): Promise<IFileAnalysisResult> => emptyAnalysis(absolutePath)),
        supportsFile: vi.fn(() => false),
      },
      sha: 'abc123',
      signal: new AbortController().signal,
      workspaceRoot: '/workspace',
    });

    expect(nodes).toEqual([existingNode]);
  });

  it('rebuilds outgoing edges for supported modified files', async () => {
    const nodes = [{ id: 'src/a.ts', label: 'a.ts', color: '#93C5FD' }];
    const nodeMap = new Map([[nodes[0].id, nodes[0]]]);
    const edges: Array<{ id: string; from: string; to: string; kind: 'import'; sources: { id: string; pluginId: string; sourceId: string; label: string }[] }> = [
      { id: 'src/a.ts->src/old.ts#import', from: 'src/a.ts', to: 'src/old.ts' , kind: 'import', sources: [] },
      { id: 'src/c.ts->src/a.ts#import', from: 'src/c.ts', to: 'src/a.ts' , kind: 'import', sources: [] },
    ];
    const edgeSet = new Set(edges.map((edge) => edge.id));
    const registry = {
      analyzeFileResult: vi.fn(async (absolutePath: string): Promise<IFileAnalysisResult> => ({
        filePath: absolutePath,
        relations: [
          {
            sourceId: 'import',
            specifier: './new',
            type: 'static',
            resolvedPath: '/workspace/src/new.ts',
            kind: 'import',
            fromFilePath: absolutePath,
          },
        ],
      })),
      getPluginForFile: vi.fn(() => ({ id: 'ts' })),
      supportsFile: vi.fn(() => true),
    };

    await modifyGitHistoryGraphFile({
      edgeSet,
      edges,
      filePath: 'src/a.ts',
      getFileAtCommit: vi.fn(async () => 'import "./new";'),
      nodeMap,
      nodes,
      registry,
      sha: 'abc123',
      signal: new AbortController().signal,
      workspaceRoot: '/workspace',
    });

    expect(edges).toEqual([
      { id: 'src/c.ts->src/a.ts#import', from: 'src/c.ts', to: 'src/a.ts' , kind: 'import', sources: [] },
      {
        id: 'src/a.ts->src/new.ts#import:static',
        from: 'src/a.ts',
        to: 'src/new.ts',
        kind: 'import',
        sources: [
          {
            id: 'ts:import',
            pluginId: 'ts',
            sourceId: 'import',
            label: 'import',
            metadata: undefined,
            variant: undefined,
          },
        ],
      },
    ]);
    expect(edgeSet).toEqual(new Set(['src/c.ts->src/a.ts#import', 'src/a.ts->src/new.ts#import:static']));
  });

  it('skips modify reanalysis for unsupported files', async () => {
    const getFileAtCommit = vi.fn(async () => '');
    const edges: IGraphEdge[] = [{ id: 'src/a.txt->src/b.txt#import', from: 'src/a.txt', to: 'src/b.txt' , kind: 'import', sources: [] }];
    const edgeSet = new Set(['src/a.txt->src/b.txt#import']);
    const registry = {
      analyzeFileResult: vi.fn(async (absolutePath: string): Promise<IFileAnalysisResult> => emptyAnalysis(absolutePath)),
      supportsFile: vi.fn(() => false),
    };

    await modifyGitHistoryGraphFile({
      edgeSet,
      edges,
      filePath: 'src/a.txt',
      getFileAtCommit,
      nodeMap: new Map(),
      nodes: [],
      registry,
      sha: 'abc123',
      signal: new AbortController().signal,
      workspaceRoot: '/workspace',
    });

    expect(registry.analyzeFileResult).not.toHaveBeenCalled();
    expect(getFileAtCommit).not.toHaveBeenCalled();
    expect(edges).toEqual([{ id: 'src/a.txt->src/b.txt#import', from: 'src/a.txt', to: 'src/b.txt' , kind: 'import', sources: [] }]);
    expect(edgeSet).toEqual(new Set(['src/a.txt->src/b.txt#import']));
  });
});
