import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  createCodeGraphyWorkspaceEngine,
  readCodeGraphyWorkspaceSettings,
  readWorkspaceAnalysisDatabaseSnapshot,
  writeCodeGraphyWorkspaceSettings,
} from '../../src';
import { createTextPlugin, createWorkspace } from './workspaceFixture';

describe('createCodeGraphyWorkspaceEngine', () => {
  it('keeps plugins loaded until disposal and disposes once', async () => {
    const workspaceRoot = await createWorkspace();
    const onUnload = vi.fn();
    const engine = createCodeGraphyWorkspaceEngine({
      workspaceRoot,
      plugins: [{
        ...createTextPlugin({
          onPreAnalyze: vi.fn(),
          onPostAnalyze: vi.fn(),
          onWorkspaceReady: vi.fn(),
          analyzeFile: vi.fn(),
        }),
        onUnload,
      }],
      includeCorePlugins: false,
    });

    await engine.index();
    expect(onUnload).not.toHaveBeenCalled();

    engine.dispose();
    engine.dispose();

    expect(onUnload).toHaveBeenCalledOnce();
  });

  it('does not create another plugin registry after disposal', async () => {
    const workspaceRoot = await createWorkspace();
    const onUnload = vi.fn();
    const engine = createCodeGraphyWorkspaceEngine({
      workspaceRoot,
      plugins: [{
        ...createTextPlugin({
          onPreAnalyze: vi.fn(),
          onPostAnalyze: vi.fn(),
          onWorkspaceReady: vi.fn(),
          analyzeFile: vi.fn(),
        }),
        onUnload,
      }],
      includeCorePlugins: false,
    });

    await engine.index();
    engine.dispose();

    await expect(engine.index()).rejects.toThrow('CodeGraphy Workspace Engine is disposed.');
    expect(onUnload).toHaveBeenCalledOnce();
  });

  it('does not retain plugins when disposal interrupts initialization', async () => {
    const workspaceRoot = await createWorkspace();
    let markInitializationStarted!: () => void;
    let finishInitialization!: () => void;
    const initializationStarted = new Promise<void>((resolve) => {
      markInitializationStarted = resolve;
    });
    const initializationGate = new Promise<void>((resolve) => {
      finishInitialization = resolve;
    });
    const lifecycleCalls: string[] = [];
    let resourceActive = false;
    const onUnload = vi.fn(() => {
      lifecycleCalls.push('unload');
      resourceActive = false;
    });
    const engine = createCodeGraphyWorkspaceEngine({
      workspaceRoot,
      plugins: [{
        ...createTextPlugin({
          onPreAnalyze: vi.fn(),
          onPostAnalyze: vi.fn(),
          onWorkspaceReady: vi.fn(),
          analyzeFile: vi.fn(),
        }),
        async initialize() {
          lifecycleCalls.push('initialize-start');
          markInitializationStarted();
          await initializationGate;
          lifecycleCalls.push('initialize-finish');
          resourceActive = true;
        },
        onUnload,
      }],
      includeCorePlugins: false,
    });

    const indexing = engine.index();
    await initializationStarted;
    engine.dispose();
    finishInitialization();

    await expect(indexing).rejects.toThrow('CodeGraphy Workspace Engine is disposed.');
    expect(onUnload).toHaveBeenCalledOnce();
    expect(resourceActive).toBe(false);
    expect(lifecycleCalls).toEqual(['initialize-start', 'initialize-finish', 'unload']);
  });

  it('waits for active analysis before unloading plugin resources', async () => {
    const workspaceRoot = await createWorkspace();
    let markAnalysisStarted!: () => void;
    let finishAnalysis!: () => void;
    const analysisStarted = new Promise<void>((resolve) => {
      markAnalysisStarted = resolve;
    });
    const analysisGate = new Promise<void>((resolve) => {
      finishAnalysis = resolve;
    });
    let resourceActive = false;
    const onUnload = vi.fn(() => {
      resourceActive = false;
    });
    const engine = createCodeGraphyWorkspaceEngine({
      workspaceRoot,
      plugins: [{
        ...createTextPlugin({
          onPreAnalyze: vi.fn(),
          onPostAnalyze: vi.fn(),
          onWorkspaceReady: vi.fn(),
          analyzeFile: vi.fn(),
        }),
        async analyzeFile(filePath: string) {
          markAnalysisStarted();
          await analysisGate;
          resourceActive = true;
          return { filePath, relations: [] };
        },
        onUnload,
      }],
      includeCorePlugins: false,
    });

    const indexing = engine.index();
    await analysisStarted;
    engine.dispose();

    expect(onUnload).not.toHaveBeenCalled();
    finishAnalysis();
    await expect(indexing).rejects.toThrow('CodeGraphy Workspace Engine is disposed.');
    expect(onUnload).toHaveBeenCalledOnce();
    expect(resourceActive).toBe(false);
  });

  it('serializes overlapping operations so one registry owns the workspace at a time', async () => {
    const workspaceRoot = await createWorkspace();
    let finishFirstInitialization!: () => void;
    const firstInitializationGate = new Promise<void>((resolve) => {
      finishFirstInitialization = resolve;
    });
    let markFirstInitializationStarted!: () => void;
    const firstInitializationStarted = new Promise<void>((resolve) => {
      markFirstInitializationStarted = resolve;
    });
    let markSecondInitializationStarted!: () => void;
    const secondInitializationStarted = new Promise<void>((resolve) => {
      markSecondInitializationStarted = resolve;
    });
    const initialize = vi.fn(async () => {
      if (initialize.mock.calls.length === 1) {
        markFirstInitializationStarted();
        await firstInitializationGate;
        return;
      }
      markSecondInitializationStarted();
    });
    const onUnload = vi.fn();
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
        onUnload,
      }],
      includeCorePlugins: false,
    });

    const firstIndex = engine.index();
    await firstInitializationStarted;
    const secondIndex = engine.index();
    const earlySecondInitialization = await Promise.race([
      secondInitializationStarted.then(() => true),
      new Promise<false>(resolve => setTimeout(() => resolve(false), 100)),
    ]);

    expect(earlySecondInitialization).toBe(false);
    expect(initialize).toHaveBeenCalledOnce();

    finishFirstInitialization();
    await firstIndex;
    await secondIndex;
    engine.dispose();

    expect(initialize).toHaveBeenCalledTimes(2);
    expect(onUnload).toHaveBeenCalledTimes(2);
  });

  it('retains cached files when filters are re-enabled across engine indexes', async () => {
    const workspaceRoot = await createWorkspace();
    await mkdir(join(workspaceRoot, '.claude'), { recursive: true });
    await writeFile(join(workspaceRoot, '.claude', 'notes.txt'), 'hidden\n', 'utf-8');
    const baseSettings = {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      include: ['**/*.txt'],
      maxFiles: 10,
      respectGitignore: false,
    };
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...baseSettings,
      filterPatterns: ['.claude/**'],
    });
    const engine = createCodeGraphyWorkspaceEngine({
      workspaceRoot,
      plugins: [createTextPlugin({
        onPreAnalyze: vi.fn(),
        onPostAnalyze: vi.fn(),
        onWorkspaceReady: vi.fn(),
        analyzeFile: vi.fn(),
      })],
      includeCorePlugins: false,
    });

    await engine.index();
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...baseSettings,
      filterPatterns: [],
    });
    await engine.index();
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...baseSettings,
      filterPatterns: ['.claude/**'],
    });
    const filteredAgain = await engine.index();

    expect(
      readWorkspaceAnalysisDatabaseSnapshot(workspaceRoot).files.map(file => file.filePath),
    ).toContain('.claude/notes.txt');
    expect(filteredAgain.graph.nodes.map(node => node.id)).not.toContain('.claude/notes.txt');
    engine.dispose();
  });

  it('applies known changed files incrementally after the first index', async () => {
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

    expect(result.indexing.mode).toBe('incremental');
    expect(analyzeFile).toHaveBeenCalledOnce();
    expect(analyzeFile).toHaveBeenCalledWith(sourcePath, 'target.txt\n', workspaceRoot);
    engine.dispose();
  });

  it('falls back to a full index when a changed path is not discoverable', async () => {
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

  it('does not unload before every queued operation settles after disposal', async () => {
    const workspaceRoot = await createWorkspace();
    let markFilesChangedStarted!: () => void;
    let finishFilesChanged!: () => void;
    const filesChangedStarted = new Promise<void>((resolve) => {
      markFilesChangedStarted = resolve;
    });
    const filesChangedGate = new Promise<void>((resolve) => {
      finishFilesChanged = resolve;
    });
    const lifecycleCalls: string[] = [];
    const plugin = {
      ...createTextPlugin({
        onPreAnalyze: vi.fn(),
        onPostAnalyze: vi.fn(),
        onWorkspaceReady: vi.fn(),
        analyzeFile: vi.fn(),
      }),
      async onFilesChanged() {
        markFilesChangedStarted();
        await filesChangedGate;
        return [];
      },
      onUnload() {
        lifecycleCalls.push('unload');
      },
    };
    const engine = createCodeGraphyWorkspaceEngine({
      workspaceRoot,
      plugins: [plugin],
      includeCorePlugins: false,
    });
    await engine.index();
    const sourcePath = join(workspaceRoot, 'source.txt');
    const firstOperation = engine.applyChangedFiles([sourcePath]);
    await filesChangedStarted;
    const secondOperation = engine.applyChangedFiles([sourcePath]);
    firstOperation.catch(() => lifecycleCalls.push('first-rejected'));
    secondOperation.catch(() => lifecycleCalls.push('second-rejected'));

    engine.dispose();
    finishFilesChanged();
    await expect(firstOperation).rejects.toThrow('CodeGraphy Workspace Engine is disposed.');
    await expect(secondOperation).rejects.toThrow('CodeGraphy Workspace Engine is disposed.');

    expect(lifecycleCalls).toEqual(['first-rejected', 'unload', 'second-rejected']);
  });
});
