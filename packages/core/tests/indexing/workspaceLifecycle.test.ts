import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import {
    createCodeGraphyWorkspaceEngine,
    indexCodeGraphyWorkspace,
    readCodeGraphyWorkspaceSettings,
    readCodeGraphyWorkspaceStatus,
    readGraphCacheStatus,
    readWorkspaceAnalysisDatabaseSnapshot,
    writeCodeGraphyWorkspaceSettings,
} from '../../src';
import { createTextPlugin, createWorkspace } from './workspaceFixture';

describe('indexCodeGraphyWorkspace indexing lifecycle', () => {
  it('indexes an explicit folder through core plugins and writes the workspace Graph Cache', async () => {
    const workspaceRoot = await createWorkspace();
    const calls = {
      onPreAnalyze: vi.fn(),
      onPostAnalyze: vi.fn(),
      onWorkspaceReady: vi.fn(),
      analyzeFile: vi.fn(),
    };

    const result = await indexCodeGraphyWorkspace({
      workspaceRoot,
      plugins: [createTextPlugin(calls)],
      includeCorePlugins: false,
    });

    expect(result.workspaceRoot).toBe(path.resolve(workspaceRoot));
    expect(result.graph.nodes.map(node => node.id)).toEqual(
      expect.arrayContaining(['source.txt', 'target.txt']),
    );
    expect(result.graph.edges).toContainEqual(
      expect.objectContaining({
        from: 'source.txt',
        to: 'target.txt',
        kind: 'import',
      }),
    );
    expect(calls.onPreAnalyze).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ relativePath: 'source.txt' }),
        expect.objectContaining({ relativePath: 'target.txt' }),
      ]),
      path.resolve(workspaceRoot),
    );
    expect(calls.analyzeFile).toHaveBeenCalledTimes(2);
    expect(calls.onPostAnalyze).toHaveBeenCalledWith(result.graph);
    expect(calls.onWorkspaceReady).toHaveBeenCalledWith(result.graph);
    expect(readGraphCacheStatus(workspaceRoot).state).toBe('available');
    expect(readWorkspaceAnalysisDatabaseSnapshot(workspaceRoot).files.map(file => file.filePath)).toEqual(
      expect.arrayContaining(['source.txt', 'target.txt']),
    );
  });

  it('keeps orphan files in the core index regardless of graph view settings', async () => {
    const workspaceRoot = await createWorkspace();
    await fs.writeFile(path.join(workspaceRoot, 'orphan.txt'), 'unlinked\n', 'utf-8');
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      showOrphans: false,
    });

    const result = await indexCodeGraphyWorkspace({
      workspaceRoot,
      plugins: [createTextPlugin({
        onPreAnalyze: vi.fn(),
        onPostAnalyze: vi.fn(),
        onWorkspaceReady: vi.fn(),
        analyzeFile: vi.fn(),
      })],
      includeCorePlugins: false,
    });

    expect(result.graph.nodes.map(node => node.id)).toEqual(
      expect.arrayContaining(['source.txt', 'target.txt', 'orphan.txt']),
    );
    expect(result.graph.nodes.map(node => node.id)).not.toContain('.codegraphy');
  });

  it('keeps indexing state in core so changed files update the graph without full indexing', async () => {
    const workspaceRoot = await createWorkspace();
    await fs.writeFile(path.join(workspaceRoot, 'target-2.txt'), 'done\n', 'utf-8');
    const calls = {
      onPreAnalyze: vi.fn(),
      onPostAnalyze: vi.fn(),
      onWorkspaceReady: vi.fn(),
      analyzeFile: vi.fn(),
      onFilesChanged: vi.fn<(files: Array<{ relativePath: string }>) => Promise<string[]>>(async () => []),
    };
    const plugin = {
      ...createTextPlugin(calls),
      async onFilesChanged(files: Array<{ relativePath: string }>) {
        calls.onFilesChanged(files);
        return [];
      },
    };
    const engine = createCodeGraphyWorkspaceEngine({
      workspaceRoot,
      plugins: [plugin],
      includeCorePlugins: false,
    });

    const initial = await engine.index();
    await fs.writeFile(path.join(workspaceRoot, 'source.txt'), 'target-2.txt\n', 'utf-8');
    const refreshed = await engine.applyChangedFiles([
      'source.txt',
    ]);

    expect(initial.graph.edges).toContainEqual(
      expect.objectContaining({
        from: 'source.txt',
        to: 'target.txt',
      }),
    );
    expect(refreshed.graph.edges).toContainEqual(
      expect.objectContaining({
        from: 'source.txt',
        to: 'target-2.txt',
      }),
    );
    expect(refreshed.graph.edges).not.toContainEqual(
      expect.objectContaining({
        from: 'source.txt',
        to: 'target.txt',
      }),
    );
    expect(calls.onFilesChanged).toHaveBeenCalledWith([
      expect.objectContaining({ relativePath: 'source.txt' }),
    ]);
    expect(calls.onPostAnalyze).toHaveBeenCalledTimes(2);
    expect(calls.onPostAnalyze).toHaveBeenLastCalledWith(refreshed.graph);
    expect(calls.onWorkspaceReady).toHaveBeenCalledTimes(1);
    expect(calls.analyzeFile).toHaveBeenCalledTimes(4);
    expect(calls.analyzeFile).toHaveBeenLastCalledWith(
      path.join(workspaceRoot, 'source.txt'),
      'target-2.txt\n',
      path.resolve(workspaceRoot),
    );
    expect(readCodeGraphyWorkspaceStatus(workspaceRoot, { plugins: [plugin] }).state).toBe('fresh');
  });

  it('reanalyzes reverse dependents when a target file changes', async () => {
    const workspaceRoot = await createWorkspace();
    const calls = {
      onPreAnalyze: vi.fn(),
      onPostAnalyze: vi.fn(),
      onWorkspaceReady: vi.fn(),
      analyzeFile: vi.fn(),
    };
    const plugin = createTextPlugin(calls);
    const engine = createCodeGraphyWorkspaceEngine({
      workspaceRoot,
      plugins: [plugin],
      includeCorePlugins: false,
    });

    await engine.index();
    await fs.writeFile(path.join(workspaceRoot, 'target.txt'), 'changed\n', 'utf-8');
    await engine.applyChangedFiles(['target.txt']);

    expect(calls.analyzeFile).toHaveBeenCalledTimes(4);
    expect(calls.analyzeFile).toHaveBeenNthCalledWith(
      4,
      path.join(workspaceRoot, 'source.txt'),
      'target.txt\n',
      path.resolve(workspaceRoot),
    );
  });
});
