import { describe, expect, it, vi } from 'vitest';
import type { IConnection } from '../../../src/core/plugins/types/contracts';
import {
  reanalyzeGraphFile,
  removeOutgoingGitHistoryEdges,
} from '../../../src/extension/gitHistory/reanalyzeGraphFile';

describe('gitHistory/reanalyzeGraphFile', () => {
  const noConnections = (): IConnection[] => [];

  it('returns early for unsupported files', async () => {
    const getFileAtCommit = vi.fn(async () => '');
    const registry = {
      analyzeFile: vi.fn(async (): Promise<IConnection[]> => noConnections()),
      getPluginForFile: vi.fn(() => ({ id: 'ts' })),
      supportsFile: vi.fn(() => false),
    };
    const edges = [{ id: 'src/a.txt->src/b.txt', from: 'src/a.txt', to: 'src/b.txt' }];
    const edgeSet = new Set(['src/a.txt->src/b.txt']);
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
    expect(registry.analyzeFile).not.toHaveBeenCalled();
    expect(registry.getPluginForFile).not.toHaveBeenCalled();
    expect(nodes).toEqual([{ id: 'src/a.txt', label: 'a.txt', color: '#CBD5E1' }]);
    expect(edges).toEqual([{ id: 'src/a.txt->src/b.txt', from: 'src/a.txt', to: 'src/b.txt' }]);
  });

  it('adds missing nodes and plugin-qualified edges during reanalysis', async () => {
    const edges: Array<{ id: string; from: string; to: string; ruleId?: string; ruleIds?: string[] }> = [];
    const nodeMap = new Map();
    const nodes: Array<{ id: string; label: string; color: string }> = [];
    const registry = {
      analyzeFile: vi.fn(async (): Promise<IConnection[]> => [
        {
          ruleId: 'import',
          specifier: './b',
          type: 'static',
          resolvedPath: '/workspace/src/b.ts',
        } satisfies IConnection,
      ]),
      getPluginForFile: vi.fn(() => ({ id: 'ts' })),
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
        id: 'src/a.ts->src/b.ts',
        from: 'src/a.ts',
        to: 'src/b.ts',
        ruleId: 'import',
        ruleIds: ['ts:import'],
      },
    ]);
  });

  it('keeps plain rule ids when no plugin id is available', async () => {
    const edges: Array<{ id: string; from: string; to: string; ruleId?: string; ruleIds?: string[] }> = [];
    const edgeSet = new Set<string>();
    const getFileAtCommit = vi.fn(async () => 'import "./b";');
    const registry = {
      analyzeFile: vi.fn(async (): Promise<IConnection[]> => [
        {
          ruleId: 'import',
          specifier: './b',
          type: 'static',
          resolvedPath: '/workspace/src/b.ts',
        } satisfies IConnection,
      ]),
      getPluginForFile: vi.fn(() => undefined),
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
    expect(registry.getPluginForFile).toHaveBeenCalledWith('/workspace/src/a.ts');
    expect(edges).toEqual([
      {
        id: 'src/a.ts->src/b.ts',
        from: 'src/a.ts',
        to: 'src/b.ts',
        ruleId: 'import',
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
        analyzeFile: vi.fn(async (): Promise<IConnection[]> => noConnections()),
        supportsFile: vi.fn(() => true),
      },
      sha: 'abc123',
      signal: new AbortController().signal,
      workspaceRoot: '/workspace',
    });

    expect(nodes).toEqual([existingNode]);
  });

  it('removes only outgoing edges from the requested file', () => {
    const edges = [
      { id: 'src/a.ts->src/b.ts', from: 'src/a.ts', to: 'src/b.ts' },
      { id: 'src/c.ts->src/a.ts', from: 'src/c.ts', to: 'src/a.ts' },
    ];
    const edgeSet = new Set(edges.map((edge) => edge.id));

    removeOutgoingGitHistoryEdges('src/a.ts', edges, edgeSet);

    expect(edges).toEqual([{ id: 'src/c.ts->src/a.ts', from: 'src/c.ts', to: 'src/a.ts' }]);
    expect(edgeSet).toEqual(new Set(['src/c.ts->src/a.ts']));
  });
});
