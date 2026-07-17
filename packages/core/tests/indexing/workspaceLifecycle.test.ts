import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import {
  createCodeGraphyWorkspaceEngine,
  indexCodeGraphyWorkspace,
  readGraphCacheStatus,
  readCodeGraphyWorkspaceStatus,
  readCodeGraphyWorkspaceSettings,
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

  it('reuses compatible persisted analysis and reparses only changed files across CLI-style runs', async () => {
    const workspaceRoot = await createWorkspace();
    const calls = {
      onPreAnalyze: vi.fn(),
      onPostAnalyze: vi.fn(),
      onWorkspaceReady: vi.fn(),
      analyzeFile: vi.fn(),
    };
    const options = {
      workspaceRoot,
      plugins: [createTextPlugin(calls)],
      includeCorePlugins: false,
    };

    const initial = await indexCodeGraphyWorkspace(options);
    const unchanged = await indexCodeGraphyWorkspace(options);
    await fs.writeFile(path.join(workspaceRoot, 'source.txt'), 'target-2.txt\n', 'utf-8');
    const changed = await indexCodeGraphyWorkspace(options);
    const incompatible = await indexCodeGraphyWorkspace({
      ...options,
      settings: {
        ...readCodeGraphyWorkspaceSettings(workspaceRoot),
        respectGitignore: false,
      },
    });

    expect(initial.indexing).toEqual({
      mode: 'full',
      analyzedFiles: 2,
      deletedFiles: 0,
      reusedFiles: 0,
    });
    expect(unchanged.indexing).toEqual({
      mode: 'incremental',
      analyzedFiles: 0,
      deletedFiles: 0,
      reusedFiles: 2,
    });
    expect(changed.indexing).toEqual({
      mode: 'incremental',
      analyzedFiles: 1,
      deletedFiles: 0,
      reusedFiles: 1,
    });
    expect(incompatible.indexing).toEqual({
      mode: 'full',
      analyzedFiles: 2,
      deletedFiles: 0,
      reusedFiles: 0,
    });
    expect(calls.analyzeFile).toHaveBeenCalledTimes(5);
  });

  it('applies plugin invalidation paths during incremental CLI-style indexing', async () => {
    const workspaceRoot = await createWorkspace();
    const calls = {
      onPreAnalyze: vi.fn(),
      onPostAnalyze: vi.fn(),
      onWorkspaceReady: vi.fn(),
      analyzeFile: vi.fn(),
    };
    const onFilesChanged = vi.fn(async () => ['target.txt']);
    const plugin = {
      ...createTextPlugin(calls),
      onFilesChanged,
    };
    const options = {
      workspaceRoot,
      plugins: [plugin],
      includeCorePlugins: false,
    };

    await indexCodeGraphyWorkspace(options);
    await fs.writeFile(path.join(workspaceRoot, 'source.txt'), 'target-2.txt\n', 'utf-8');
    const refreshed = await indexCodeGraphyWorkspace(options);

    expect(onFilesChanged).toHaveBeenCalledWith(
      [expect.objectContaining({ relativePath: 'source.txt' })],
      path.resolve(workspaceRoot),
      expect.any(Object),
    );
    expect(refreshed.indexing).toEqual({
      mode: 'incremental',
      analyzedFiles: 2,
      deletedFiles: 0,
      reusedFiles: 0,
    });
  });

  it('removes an unreferenced deleted file without rebuilding unchanged files', async () => {
    const workspaceRoot = await createWorkspace();
    await fs.writeFile(path.join(workspaceRoot, 'orphan.txt'), 'unused\n', 'utf-8');
    const calls = {
      onPreAnalyze: vi.fn(),
      onPostAnalyze: vi.fn(),
      onWorkspaceReady: vi.fn(),
      analyzeFile: vi.fn(),
    };
    const options = {
      workspaceRoot,
      plugins: [createTextPlugin(calls)],
      includeCorePlugins: false,
    };

    await indexCodeGraphyWorkspace(options);
    await fs.rm(path.join(workspaceRoot, 'orphan.txt'));
    const rebuilt = await indexCodeGraphyWorkspace(options);

    expect(rebuilt.indexing).toEqual({
      mode: 'incremental',
      analyzedFiles: 0,
      deletedFiles: 1,
      reusedFiles: 2,
    });
  });

  it('adds an unreferenced file without rebuilding unchanged files', async () => {
    const workspaceRoot = await createWorkspace();
    const calls = {
      onPreAnalyze: vi.fn(),
      onPostAnalyze: vi.fn(),
      onWorkspaceReady: vi.fn(),
      analyzeFile: vi.fn(),
    };
    const options = {
      workspaceRoot,
      plugins: [createTextPlugin(calls)],
      includeCorePlugins: false,
    };

    await indexCodeGraphyWorkspace(options);
    await fs.writeFile(path.join(workspaceRoot, 'orphan.txt'), 'unused\n', 'utf-8');
    const refreshed = await indexCodeGraphyWorkspace(options);

    expect(refreshed.indexing).toEqual({
      mode: 'incremental',
      analyzedFiles: 1,
      deletedFiles: 0,
      reusedFiles: 2,
    });
  });

  it('reports a safe full rebuild when a compatible-looking Graph Cache is corrupt', async () => {
    const workspaceRoot = await createWorkspace();
    const calls = {
      onPreAnalyze: vi.fn(),
      onPostAnalyze: vi.fn(),
      onWorkspaceReady: vi.fn(),
      analyzeFile: vi.fn(),
    };
    const options = {
      workspaceRoot,
      plugins: [createTextPlugin(calls)],
      includeCorePlugins: false,
    };
    const initial = await indexCodeGraphyWorkspace(options);
    await fs.writeFile(initial.graphCachePath, 'not sqlite', 'utf-8');

    const rebuilt = await indexCodeGraphyWorkspace(options);

    expect(rebuilt.indexing).toEqual({
      mode: 'full',
      analyzedFiles: 2,
      deletedFiles: 0,
      reusedFiles: 0,
    });
  });
});
