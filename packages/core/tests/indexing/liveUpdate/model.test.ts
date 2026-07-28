import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createCodeGraphyWorkspaceCacheUpdater,
  readWorkspaceAnalysisDatabaseSnapshot,
} from '../../../src';
import { createTextPlugin, createWorkspace } from '../workspaceFixture';

describe('CodeGraphy Workspace cache updater', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('coalesces changed paths and persists their latest Relationships after the debounce', async () => {
    const workspaceRoot = await createWorkspace();
    await writeFile(join(workspaceRoot, 'next.txt'), 'next\n', 'utf-8');
    const analyzeFile = vi.fn();
    let markUpdated!: () => void;
    const updated = new Promise<void>((resolve) => {
      markUpdated = resolve;
    });
    const updater = createCodeGraphyWorkspaceCacheUpdater({
      workspaceRoot,
      plugins: [createTextPlugin({
        onPreAnalyze: vi.fn(),
        onPostAnalyze: vi.fn(),
        onWorkspaceReady: vi.fn(),
        analyzeFile,
      })],
      includeCorePlugins: false,
      onEvent(event) {
        if (event.type === 'updated') markUpdated();
      },
    });
    await updater.start();
    analyzeFile.mockClear();
    vi.useFakeTimers();
    const sourcePath = join(workspaceRoot, 'source.txt');
    await writeFile(sourcePath, 'next.txt\n', 'utf-8');

    updater.notify([sourcePath, sourcePath]);
    await vi.advanceTimersByTimeAsync(499);

    expect(analyzeFile).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await updated;

    expect(analyzeFile).toHaveBeenCalledOnce();
    expect(readWorkspaceAnalysisDatabaseSnapshot(workspaceRoot).graph.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          from: 'source.txt',
          kind: 'import',
          to: 'next.txt',
        }),
      ]),
    );
    await updater.dispose();
  });

  it('flushes a continuously changing batch at its maximum age', async () => {
    const workspaceRoot = await createWorkspace();
    const analyzeFile = vi.fn();
    const onEvent = vi.fn();
    const updater = createCodeGraphyWorkspaceCacheUpdater({
      workspaceRoot,
      plugins: [createTextPlugin({
        onPreAnalyze: vi.fn(),
        onPostAnalyze: vi.fn(),
        onWorkspaceReady: vi.fn(),
        analyzeFile,
      })],
      includeCorePlugins: false,
      debounceMs: 500,
      maxBatchAgeMs: 1_000,
      onEvent,
    });
    await updater.start();
    analyzeFile.mockClear();
    vi.useFakeTimers();
    const sourcePath = join(workspaceRoot, 'source.txt');

    updater.notify([sourcePath]);
    await vi.advanceTimersByTimeAsync(400);
    updater.notify([sourcePath]);
    await vi.advanceTimersByTimeAsync(400);
    updater.notify([sourcePath]);
    await vi.advanceTimersByTimeAsync(200);

    expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: 'updating',
    }));
    await updater.dispose();
  });

  it('retains changes that arrive while an update is running', async () => {
    const workspaceRoot = await createWorkspace();
    await writeFile(join(workspaceRoot, 'next.txt'), 'next\n', 'utf-8');
    let markFirstUpdateStarted!: () => void;
    let finishFirstUpdate!: () => void;
    const firstUpdateStarted = new Promise<void>((resolve) => {
      markFirstUpdateStarted = resolve;
    });
    const firstUpdateGate = new Promise<void>((resolve) => {
      finishFirstUpdate = resolve;
    });
    const onFilesChanged = vi.fn(async () => {
      if (onFilesChanged.mock.calls.length === 1) {
        markFirstUpdateStarted();
        await firstUpdateGate;
      }
      return [];
    });
    let updateCount = 0;
    let markSecondUpdateFinished!: () => void;
    const secondUpdateFinished = new Promise<void>((resolve) => {
      markSecondUpdateFinished = resolve;
    });
    const updater = createCodeGraphyWorkspaceCacheUpdater({
      workspaceRoot,
      plugins: [{
        ...createTextPlugin({
          onPreAnalyze: vi.fn(),
          onPostAnalyze: vi.fn(),
          onWorkspaceReady: vi.fn(),
          analyzeFile: vi.fn(),
        }),
        onFilesChanged,
      }],
      includeCorePlugins: false,
      onEvent(event) {
        if (event.type !== 'updated') return;
        updateCount += 1;
        if (updateCount === 2) markSecondUpdateFinished();
      },
    });
    await updater.start();
    vi.useFakeTimers();
    const sourcePath = join(workspaceRoot, 'source.txt');
    await writeFile(sourcePath, 'target.txt\n', 'utf-8');
    updater.notify([sourcePath]);
    await vi.advanceTimersByTimeAsync(500);
    await firstUpdateStarted;

    await writeFile(sourcePath, 'next.txt\n', 'utf-8');
    updater.notify([sourcePath]);
    await vi.advanceTimersByTimeAsync(500);
    finishFirstUpdate();
    await secondUpdateFinished;

    expect(onFilesChanged).toHaveBeenCalledTimes(2);
    expect(readWorkspaceAnalysisDatabaseSnapshot(workspaceRoot).graph.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ from: 'source.txt', kind: 'import', to: 'next.txt' }),
      ]),
    );
    await updater.dispose();
  });

  it('persists a pending batch before disposal completes', async () => {
    const workspaceRoot = await createWorkspace();
    await writeFile(join(workspaceRoot, 'next.txt'), 'next\n', 'utf-8');
    const updater = createCodeGraphyWorkspaceCacheUpdater({
      workspaceRoot,
      plugins: [createTextPlugin({
        onPreAnalyze: vi.fn(),
        onPostAnalyze: vi.fn(),
        onWorkspaceReady: vi.fn(),
        analyzeFile: vi.fn(),
      })],
      includeCorePlugins: false,
    });
    await updater.start();
    vi.useFakeTimers();
    const sourcePath = join(workspaceRoot, 'source.txt');
    await writeFile(sourcePath, 'next.txt\n', 'utf-8');
    updater.notify([sourcePath]);

    await updater.dispose();

    expect(readWorkspaceAnalysisDatabaseSnapshot(workspaceRoot).graph.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ from: 'source.txt', kind: 'import', to: 'next.txt' }),
      ]),
    );
  });
});
