import { describe, expect, it, vi } from 'vitest';
import type { IConnection } from '../../../../src/core/plugins/types/contracts';
import {
  addGitHistoryGraphFile,
  modifyGitHistoryGraphFile,
} from '../../../../src/extension/gitHistory/diff/changes';

describe('gitHistory/diff/changes', () => {
  it('adds a node for unsupported files without reanalyzing them', async () => {
    const nodes: Array<{ id: string; label: string; color: string }> = [];
    const nodeMap = new Map();
    const registry = {
      analyzeFile: vi.fn(async (): Promise<IConnection[]> => []),
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

    expect(nodes).toEqual([{ id: 'src/readme.md', label: 'readme.md', color: '#CBD5E1' }]);
    expect(registry.analyzeFile).not.toHaveBeenCalled();
  });

  it('adds supported files by fetching content and appending analyzed edges', async () => {
    const edges: Array<{ id: string; from: string; to: string; ruleId?: string }> = [];
    const edgeSet = new Set<string>();
    const getFileAtCommit = vi.fn(async () => 'import "./b";');
    const registry = {
      analyzeFile: vi.fn(async (): Promise<IConnection[]> => [{
        ruleId: 'import',
        specifier: './b',
        type: 'static',
        resolvedPath: '/workspace/src/b.ts',
      }]),
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
    expect(registry.analyzeFile).toHaveBeenCalledWith(
      '/workspace/src/a.ts',
      'import "./b";',
      '/workspace',
    );
    expect(nodes).toEqual([{ id: 'src/a.ts', label: 'a.ts', color: '#93C5FD' }]);
    expect(edges).toEqual([
      {
        id: 'src/a.ts->src/b.ts',
        from: 'src/a.ts',
        to: 'src/b.ts',
        ruleId: 'import',
      },
    ]);
    expect(edgeSet).toEqual(new Set(['src/a.ts->src/b.ts']));
  });

  it('reuses an existing supported node while reanalyzing its edges', async () => {
    const existingNode = { id: 'src/a.ts', label: 'a.ts', color: '#93C5FD' };
    const nodes = [existingNode];
    const nodeMap = new Map([[existingNode.id, existingNode]]);
    const edges: Array<{ id: string; from: string; to: string; ruleId?: string }> = [];
    const edgeSet = new Set<string>();
    const getFileAtCommit = vi.fn(async () => 'import "./c";');
    const registry = {
      analyzeFile: vi.fn(async (): Promise<IConnection[]> => [{
        ruleId: 'import',
        specifier: './c',
        type: 'static',
        resolvedPath: '/workspace/src/c.ts',
      }]),
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
    expect(registry.analyzeFile).toHaveBeenCalledWith(
      '/workspace/src/a.ts',
      'import "./c";',
      '/workspace',
    );
    expect(nodes).toEqual([existingNode]);
    expect(nodeMap.get(existingNode.id)).toBe(existingNode);
    expect(edges).toEqual([
      {
        id: 'src/a.ts->src/c.ts',
        from: 'src/a.ts',
        to: 'src/c.ts',
        ruleId: 'import',
      },
    ]);
    expect(edgeSet).toEqual(new Set(['src/a.ts->src/c.ts']));
  });

  it('does not duplicate unsupported nodes that already exist', async () => {
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
        analyzeFile: vi.fn(async (): Promise<IConnection[]> => []),
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
    const edges: Array<{ id: string; from: string; to: string; ruleId?: string; ruleIds?: string[] }> = [
      { id: 'src/a.ts->src/old.ts', from: 'src/a.ts', to: 'src/old.ts' },
      { id: 'src/c.ts->src/a.ts', from: 'src/c.ts', to: 'src/a.ts' },
    ];
    const edgeSet = new Set(edges.map((edge) => edge.id));
    const registry = {
      analyzeFile: vi.fn(async (): Promise<IConnection[]> => [{
        ruleId: 'import',
        specifier: './new',
        type: 'static',
        resolvedPath: '/workspace/src/new.ts',
      }]),
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
      { id: 'src/c.ts->src/a.ts', from: 'src/c.ts', to: 'src/a.ts' },
      {
        id: 'src/a.ts->src/new.ts',
        from: 'src/a.ts',
        to: 'src/new.ts',
        ruleId: 'import',
        ruleIds: ['ts:import'],
      },
    ]);
    expect(edgeSet).toEqual(new Set(['src/c.ts->src/a.ts', 'src/a.ts->src/new.ts']));
  });

  it('skips modify reanalysis for unsupported files', async () => {
    const getFileAtCommit = vi.fn(async () => '');
    const edges = [{ id: 'src/a.txt->src/b.txt', from: 'src/a.txt', to: 'src/b.txt' }];
    const edgeSet = new Set(['src/a.txt->src/b.txt']);
    const registry = {
      analyzeFile: vi.fn(async (): Promise<IConnection[]> => []),
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

    expect(registry.analyzeFile).not.toHaveBeenCalled();
    expect(getFileAtCommit).not.toHaveBeenCalled();
    expect(edges).toEqual([{ id: 'src/a.txt->src/b.txt', from: 'src/a.txt', to: 'src/b.txt' }]);
    expect(edgeSet).toEqual(new Set(['src/a.txt->src/b.txt']));
  });
});
