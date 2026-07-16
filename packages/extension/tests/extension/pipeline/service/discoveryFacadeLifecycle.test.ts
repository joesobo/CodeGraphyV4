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
  createDeferred,
  TestDiscoveryFacade,
  getWorkspacePipelinePluginFilterPatterns,
  initializeWorkspacePipeline,
  syncWorkspacePipelinePlugins,
  hasWorkspacePipelineIndex,
  setUpDiscoveryFacade,
} from './discoveryFacadeFixture';

describe('pipeline/service/discoveryFacade lifecycle', () => {
  beforeEach(setUpDiscoveryFacade);

  it('initializes plugins with a workspace-root getter and logs completion', async () => {
    const facade = new TestDiscoveryFacade();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await facade.initialize();

    expect(initializeWorkspacePipeline).toHaveBeenCalledWith(facade._registry, expect.objectContaining({
      getWorkspaceRoot: expect.any(Function),
    }));
    expect(vi.mocked(initializeWorkspacePipeline).mock.calls[0][1].getWorkspaceRoot()).toBe('/workspace');
    expect(logSpy).toHaveBeenCalledWith('[CodeGraphy] WorkspacePipeline initialized');
  });

  it('serializes concurrent workspace plugin syncs without disposing unrelated plugins', async () => {
    const facade = new TestDiscoveryFacade();
    const firstReload = createDeferred();
    const secondReload = createDeferred();
    vi.mocked(syncWorkspacePipelinePlugins)
      .mockImplementationOnce(() => firstReload.promise)
      .mockImplementationOnce(() => secondReload.promise);

    const first = facade.syncWorkspacePlugins();
    const second = facade.syncWorkspacePlugins();

    await expect.poll(() => vi.mocked(syncWorkspacePipelinePlugins).mock.calls.length).toBe(1);
    expect(facade._registry.disposeAll).not.toHaveBeenCalled();

    firstReload.resolve(undefined);
    await first;
    await expect.poll(() => vi.mocked(syncWorkspacePipelinePlugins).mock.calls.length).toBe(2);
    expect(facade._registry.disposeAll).not.toHaveBeenCalled();

    secondReload.resolve(undefined);
    await expect(Promise.all([first, second])).resolves.toEqual([undefined, undefined]);
    expect(syncWorkspacePipelinePlugins).toHaveBeenCalledWith(facade._registry, expect.objectContaining({
      getWorkspaceRoot: expect.any(Function),
    }));
  });

  it('delegates plugin filters and index checks through the shared helpers', () => {
    const facade = new TestDiscoveryFacade();
    const disabledPlugins = new Set(['plugin.disabled']);

    expect(facade.getPluginFilterPatterns(disabledPlugins)).toEqual(['plugin-filter']);
    expect(getWorkspacePipelinePluginFilterPatterns).toHaveBeenCalledWith(facade._registry, disabledPlugins);

    expect(facade.hasIndex()).toBe(true);
    expect(hasWorkspacePipelineIndex).toHaveBeenCalledWith('/workspace');
  });
});
