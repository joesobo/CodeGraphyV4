import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import {
    indexCodeGraphyWorkspace,
    readCodeGraphyWorkspaceSettings,
} from '../../src';
import { createTextPlugin, createWorkspace } from './workspaceFixture';

describe('indexCodeGraphyWorkspace indexing lifecycle', () => {

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
    const gitignoreToggle = await indexCodeGraphyWorkspace({
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
    expect(gitignoreToggle.indexing).toEqual({
      mode: 'incremental',
      analyzedFiles: 0,
      deletedFiles: 0,
      reusedFiles: 2,
    });
    expect(calls.analyzeFile).toHaveBeenCalledTimes(3);
  });

  it('performs a full rebuild when a previously failed plugin recovers', async () => {
    const workspaceRoot = await createWorkspace();
    let initializationAttempts = 0;
    const recoveringPlugin = {
      ...createTextPlugin({
        onPreAnalyze: vi.fn(),
        onPostAnalyze: vi.fn(),
        onWorkspaceReady: vi.fn(),
        analyzeFile: vi.fn(),
      }),
      id: 'acme.recovering',
      async initialize() {
        initializationAttempts += 1;
        if (initializationAttempts === 1) throw new Error('initialization failed');
      },
    };
    const healthyPlugin = {
      ...createTextPlugin({
        onPreAnalyze: vi.fn(),
        onPostAnalyze: vi.fn(),
        onWorkspaceReady: vi.fn(),
        analyzeFile: vi.fn(),
      }),
      id: 'acme.healthy',
    };
    const options = {
      workspaceRoot,
      plugins: [recoveringPlugin, healthyPlugin],
      includeCorePlugins: false,
    };
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await indexCodeGraphyWorkspace(options);
    const recovered = await indexCodeGraphyWorkspace(options);

    expect(recovered.indexing.mode).toBe('full');
    expect(recovered.indexing.analyzedFiles).toBe(2);
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
