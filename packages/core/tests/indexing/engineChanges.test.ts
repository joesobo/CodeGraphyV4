import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { createCodeGraphyWorkspaceEngine } from '../../src';
import { createTextPlugin, createWorkspace } from './workspaceFixture';

describe('workspace engine changed files', () => {
  it('reports a targeted update as incremental work', async () => {
    const workspaceRoot = await createWorkspace();
    const analyzeFile = vi.fn();
    const engine = createCodeGraphyWorkspaceEngine({
      workspaceRoot,
      plugins: [createTextPlugin({
        onPreAnalyze: vi.fn(),
        onPostAnalyze: vi.fn(),
        onWorkspaceReady: vi.fn(),
        analyzeFile,
      })],
      includeCorePlugins: false,
    });
    await engine.index();
    analyzeFile.mockClear();
    const sourcePath = join(workspaceRoot, 'source.txt');
    await writeFile(sourcePath, 'target.txt\n', 'utf-8');

    const result = await engine.applyChangedFiles([sourcePath]);

    expect(result.indexing).toEqual({
      mode: 'incremental',
      analyzedFiles: 1,
      deletedFiles: 0,
      reusedFiles: 1,
    });
    expect(analyzeFile).toHaveBeenCalledOnce();
    engine.dispose();
  });

  it('reports a full fallback when the changed path is not discoverable', async () => {
    const workspaceRoot = await createWorkspace();
    const initialize = vi.fn();
    const engine = createCodeGraphyWorkspaceEngine({
      workspaceRoot,
      plugins: [{
        ...createTextPlugin({
          onPreAnalyze: vi.fn(),
          onPostAnalyze: vi.fn(),
          onWorkspaceReady: vi.fn(),
          analyzeFile: vi.fn(),
        }),
        initialize,
      }],
      includeCorePlugins: false,
    });
    await engine.index();

    const result = await engine.applyChangedFiles([join(workspaceRoot, 'missing.txt')]);

    expect(result.indexing.mode).toBe('full');
    expect(initialize).toHaveBeenCalledTimes(2);
    engine.dispose();
  });

  it('falls back to a full index when a plugin cannot apply changed files safely', async () => {
    const workspaceRoot = await createWorkspace();
    const initialize = vi.fn();
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const engine = createCodeGraphyWorkspaceEngine({
      workspaceRoot,
      plugins: [{
        ...createTextPlugin({
          onPreAnalyze: vi.fn(),
          onPostAnalyze: vi.fn(),
          onWorkspaceReady: vi.fn(),
          analyzeFile: vi.fn(),
        }),
        initialize,
        async onFilesChanged() {
          throw new Error('refresh failed');
        },
      }],
      includeCorePlugins: false,
    });
    await engine.index();

    const result = await engine.applyChangedFiles([join(workspaceRoot, 'source.txt')]);

    expect(result.indexing.mode).toBe('full');
    expect(initialize).toHaveBeenCalledTimes(2);
    expect(error).toHaveBeenCalledWith(
      '[CodeGraphy] Error in onFilesChanged for codegraphy.test-text:',
      expect.any(Error),
    );
    engine.dispose();
    error.mockRestore();
  });

  it('reanalyzes reverse dependents of a changed file', async () => {
    const workspaceRoot = await createWorkspace();
    const analyzeFile = vi.fn();
    const engine = createCodeGraphyWorkspaceEngine({
      workspaceRoot,
      plugins: [createTextPlugin({
        onPreAnalyze: vi.fn(),
        onPostAnalyze: vi.fn(),
        onWorkspaceReady: vi.fn(),
        analyzeFile,
      })],
      includeCorePlugins: false,
    });
    await engine.index();
    analyzeFile.mockClear();
    const targetPath = join(workspaceRoot, 'target.txt');
    await writeFile(targetPath, 'updated\n', 'utf-8');

    const result = await engine.applyChangedFiles([targetPath]);

    expect(result.indexing).toEqual({
      mode: 'incremental',
      analyzedFiles: 2,
      deletedFiles: 0,
      reusedFiles: 0,
    });
    expect(analyzeFile).toHaveBeenCalledTimes(2);
    expect(analyzeFile.mock.calls.map(([filePath]) => filePath).sort()).toEqual([
      join(workspaceRoot, 'source.txt'),
      targetPath,
    ].sort());
    engine.dispose();
  });
});
