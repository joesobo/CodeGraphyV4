import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../src/extension/pipeline/service/cache/storage', () => ({
  clearWorkspacePipelineStoredCache: vi.fn(),
}));
vi.mock('../../../../src/extension/pipeline/service/cache/invalidation', () => ({
  invalidateWorkspacePipelineFiles: vi.fn(),
  resolveWorkspacePipelinePluginFilePaths: vi.fn(),
}));
vi.mock('../../../../src/extension/pipeline/service/runtime/plugins', () => ({
  getWorkspacePipelinePluginName: vi.fn(),
  getWorkspacePipelineStatusList: vi.fn(),
}));
vi.mock('../../../../src/extension/pipeline/plugins/statusContext', () => ({
  readWorkspacePluginStatusContext: vi.fn(),
}));
vi.mock('vscode', () => ({
  workspace: {
    workspaceFolders: [{ uri: { fsPath: '/workspace' } }],
    getConfiguration: vi.fn(() => ({ get: vi.fn(), update: vi.fn(), inspect: vi.fn() })),
    createFileSystemWatcher: vi.fn(),
    onDidSaveTextDocument: vi.fn(),
    onDidChangeConfiguration: vi.fn(),
  },
}));

import {
  TestLifecycleFacade,
  lifecycleState,
  resolveWorkspacePipelinePluginFilePaths,
  setUpLifecycleFacade,
} from './lifecycleFacadeFixture';

describe('pipeline/service/lifecycleFacade', () => {
  beforeEach(setUpLifecycleFacade);

  it('returns early when plugin invalidation receives no plugin ids', () => {
    const facade = new TestLifecycleFacade();

    expect(facade.invalidatePluginFiles([])).toEqual([]);
    expect(lifecycleState(facade)._registry.list).not.toHaveBeenCalled();
    expect(resolveWorkspacePipelinePluginFilePaths).not.toHaveBeenCalled();
  });

  it('returns early when plugin invalidation has no discovered files', () => {
    const facade = new TestLifecycleFacade();

    lifecycleState(facade)._lastDiscoveredFiles = [];
    expect(facade.invalidatePluginFiles(['plugin.a'])).toEqual([]);
    expect(lifecycleState(facade)._registry.list).not.toHaveBeenCalled();
    expect(resolveWorkspacePipelinePluginFilePaths).not.toHaveBeenCalled();
  });

  it('returns early when plugin invalidation finds no matching plugins', () => {
    const facade = new TestLifecycleFacade();

    lifecycleState(facade)._lastDiscoveredFiles = [
      { absolutePath: '/workspace/src/a.ts', relativePath: 'src/a.ts', extension: '.ts', name: 'a.ts' },
    ];
    lifecycleState(facade)._registry.list.mockReturnValueOnce([
      { plugin: { id: 'plugin.other', supportedExtensions: ['.py'] } },
    ]);
    expect(facade.invalidatePluginFiles(['plugin.a'])).toEqual([]);
    expect(resolveWorkspacePipelinePluginFilePaths).not.toHaveBeenCalled();
  });

  it('resolves plugin file paths and invalidates them through the shared invalidation flow', () => {
    const facade = new TestLifecycleFacade();
    const invalidateWorkspaceFiles = vi.spyOn(facade, 'invalidateWorkspaceFiles');
    lifecycleState(facade)._registry.list.mockReturnValueOnce([
      { plugin: { id: 'plugin.a', supportedExtensions: ['.ts'] } },
      { plugin: { id: 'plugin.b', supportedExtensions: ['.py'] } },
    ]);

    expect(facade.invalidatePluginFiles(['plugin.a'])).toEqual(['src/a.ts']);
    expect(resolveWorkspacePipelinePluginFilePaths).toHaveBeenCalledWith(
      '/workspace',
      facade._lastDiscoveredFiles,
      [{ plugin: { id: 'plugin.a', supportedExtensions: ['.ts'] } }],
    );
    expect(invalidateWorkspaceFiles).toHaveBeenCalledWith(['/workspace/src/a.ts']);
  });
});
