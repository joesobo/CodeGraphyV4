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
  getWorkspacePipelinePluginName,
  getWorkspacePipelineStatusList,
  lifecycleState,
  readWorkspacePluginStatusContext,
  setUpLifecycleFacade,
  vscode,
} from './lifecycleFacadeFixture';

describe('pipeline/service/lifecycleFacade', () => {
  beforeEach(setUpLifecycleFacade);

  it('returns plugin statuses using the installed plugin status context', () => {
    const facade = new TestLifecycleFacade();
    const disabledPlugins = new Set(['plugin.disabled']);

    expect(facade.getPluginStatuses(disabledPlugins)).toEqual([{ id: 'plugin.a' }]);
    expect(readWorkspacePluginStatusContext).toHaveBeenCalledWith('/workspace');
    expect(getWorkspacePipelineStatusList).toHaveBeenCalledWith(
      facade._registry,
      disabledPlugins,
      facade._lastDiscoveredFiles,
      facade._lastFileConnections,
      {
        installedPlugins: [
          {
            package: '@codegraphy-dev/plugin-vue',
            version: '2.0.0',
            apiVersion: '^3.0.0',
            disclosures: [],
            packageRoot: '/global/node_modules/@codegraphy-dev/plugin-vue',
          },
        ],
        workspaceEnabledPluginIds: new Set(['codegraphy.vue']),
      },
    );
  });

  it('resolves plugin names using the cached workspace root and vscode workspace folders', () => {
    const facade = new TestLifecycleFacade();

    expect(facade.getPluginNameForFile('src/a.ts')).toBe('TypeScript');
    expect(getWorkspacePipelinePluginName).toHaveBeenCalledWith(
      'src/a.ts',
      '/workspace',
      facade._registry,
      vscode.workspace.workspaceFolders,
    );
  });

  it('resolves plugin names for contributed graph source plugin ids', () => {
    const facade = new TestLifecycleFacade();
    lifecycleState(facade)._registry.list.mockReturnValue([
      { plugin: { id: 'codegraphy.markdown', name: 'Markdown' } },
      { plugin: { id: 'codegraphy.vue', name: 'Vue' } },
    ]);

    expect(facade.getPluginNamesForIds([
      'codegraphy.markdown',
      'codegraphy.unknown',
      'codegraphy.vue',
    ])).toEqual(['Markdown', 'Vue']);
  });

  it('disposes the plugin registry', () => {
    const facade = new TestLifecycleFacade();

    facade.dispose();

    expect(lifecycleState(facade)._registry.disposeAll).toHaveBeenCalledOnce();
  });
});
