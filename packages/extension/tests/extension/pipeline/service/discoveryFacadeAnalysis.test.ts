import { describe, expect, it, vi, beforeEach } from 'vitest';
vi.mock('../../../../src/extension/pipeline/service/runtime/discovery', () => ({
  createWorkspacePipelineDiscoveryDependencies: vi.fn(),
  discoverWorkspacePipelineFilesWithWarnings: vi.fn(),
}));

vi.mock('../../../../src/extension/pipeline/plugins/bootstrap', () => ({
  initializeWorkspacePipeline: vi.fn(),
  syncWorkspacePipelinePlugins: vi.fn(),
  getWorkspacePipelinePluginFilterPatterns: vi.fn(),
}));

vi.mock('../../../../src/extension/pipeline/service/cache/index', () => ({
  hasWorkspacePipelineIndex: vi.fn(),
}));

vi.mock('../../../../src/extension/pipeline/service/runtime/run', () => ({
  analyzeWorkspacePipeline: vi.fn(),
  rebuildWorkspacePipelineGraph: vi.fn(),
}));

const childProcessMock = vi.hoisted(() => ({
  spawnSync: vi.fn(() => ({ error: undefined, status: 1, stdout: '' })),
}));

vi.mock('node:child_process', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:child_process')>();
  return {
    ...original,
    spawnSync: childProcessMock.spawnSync,
    default: {
      ...original,
      spawnSync: childProcessMock.spawnSync,
    },
  };
});

vi.mock('vscode', () => ({
  workspace: {
    workspaceFolders: [{ uri: { fsPath: '/workspace' } }],
    getConfiguration: vi.fn(() => ({
      get: vi.fn(),
      update: vi.fn(),
      inspect: vi.fn(),
    })),
    createFileSystemWatcher: vi.fn(),
    onDidSaveTextDocument: vi.fn(),
    onDidChangeConfiguration: vi.fn(),
  },
  window: {
    showWarningMessage: vi.fn(),
  },
}));

import {
  TestDiscoveryFacade,
  analyzeWorkspacePipeline,
  rebuildWorkspacePipelineGraph,
  setUpDiscoveryFacade,
} from './discoveryFacadeFixture';

describe('pipeline/service/discoveryFacade analysis', () => {
  beforeEach(setUpDiscoveryFacade);

  it('delegates analyze, rebuildGraph, and refreshIndex through the shared runners', async () => {
    const facade = new TestDiscoveryFacade();
    const disabledPlugins = new Set(['plugin.disabled']);
    const signal = new AbortController().signal;
    const onProgress = vi.fn();
    const analyzeSpy = vi.spyOn(facade, 'analyze');
    const persistIndexMetadata = vi
      .spyOn(
        facade as unknown as {
          _persistIndexMetadata: () => Promise<void>;
        },
        '_persistIndexMetadata',
      )
      .mockResolvedValue(undefined);

    await expect(facade.analyze(undefined, disabledPlugins, signal, onProgress)).resolves.toEqual({
      nodes: [{ id: 'analysis', label: 'Analysis', color: '#111111' }],
      edges: [],
    });
    expect(analyzeWorkspacePipeline).toHaveBeenCalledWith(
      facade,
      facade._cache,
      facade._config,
      facade._discovery,
      expect.any(Function),
      [],
      disabledPlugins,
      onProgress,
      signal,
      expect.any(Function),
    );
    expect(vi.mocked(analyzeWorkspacePipeline).mock.calls[0][4]()).toBe('/workspace');
    await vi.mocked(analyzeWorkspacePipeline).mock.calls[0][9]();
    expect(persistIndexMetadata).toHaveBeenCalledOnce();

    expect(facade.rebuildGraph(disabledPlugins, false)).toEqual({
      nodes: [{ id: 'rebuild', label: 'Rebuild', color: '#222222' }],
      edges: [],
    });
    expect(rebuildWorkspacePipelineGraph).toHaveBeenCalledWith(facade, disabledPlugins, false);

    analyzeSpy.mockResolvedValueOnce({
      nodes: [{ id: 'refresh', label: 'Refresh', color: '#444444' }],
      edges: [],
    });
    const cacheBeforeRefresh = facade._cache;
    await expect(
      facade.refreshIndex(undefined, disabledPlugins, signal),
    ).resolves.toEqual({
      nodes: [{ id: 'refresh', label: 'Refresh', color: '#444444' }],
      edges: [],
    });

    expect(facade.clearCache).not.toHaveBeenCalled();
    expect(facade._cache).not.toBe(cacheBeforeRefresh);
    expect(facade._cache.files).toEqual({});
    expect(analyzeSpy).toHaveBeenCalledWith([], disabledPlugins, signal, expect.any(Function));

    const refreshWithoutProgress = analyzeSpy.mock.calls[1][3] as (progress: {
      phase: string;
      current: number;
      total: number;
    }) => void;
    expect(() =>
      refreshWithoutProgress({ phase: 'Analyzing', current: 1, total: 2 }),
    ).not.toThrow();

    analyzeSpy.mockResolvedValueOnce({
      nodes: [{ id: 'refresh', label: 'Refresh', color: '#444444' }],
      edges: [],
    });
    await facade.refreshIndex(['*.tsx'], disabledPlugins, signal, onProgress);
    const forwardedProgress = analyzeSpy.mock.calls[2][3] as (progress: {
      phase: string;
      current: number;
      total: number;
    }) => void;
    forwardedProgress({ phase: 'Analyzing', current: 2, total: 5 });
    expect(onProgress).toHaveBeenCalledWith({
      phase: 'Analyzing',
      current: 2,
      total: 5,
    });

    forwardedProgress({ phase: '', current: 3, total: 5 });
    expect(onProgress).toHaveBeenCalledWith({
      phase: 'Refreshing Index',
      current: 3,
      total: 5,
    });
  });
});
