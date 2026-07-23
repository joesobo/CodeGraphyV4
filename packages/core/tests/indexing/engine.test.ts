import { describe, expect, it, vi } from 'vitest';
import { createCodeGraphyWorkspaceEngine } from '../../src';
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
});
