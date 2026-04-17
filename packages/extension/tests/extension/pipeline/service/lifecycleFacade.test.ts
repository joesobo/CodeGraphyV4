import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { WorkspacePipelineLifecycleFacade } from '../../../../src/extension/pipeline/service/lifecycleFacade';
import type { PluginRegistry } from '../../../../src/core/plugins/registry/manager';
import type { IWorkspaceAnalysisCache } from '../../../../src/extension/pipeline/cache';
import type { IDiscoveredFile } from '../../../../src/core/discovery/contracts';
import type {
  IFileAnalysisResult,
  IProjectedConnection,
} from '../../../../src/core/plugins/types/contracts';
import { clearWorkspacePipelineStoredCache } from '../../../../src/extension/pipeline/service/cache/storage';
import {
  invalidateWorkspacePipelineFiles,
  resolveWorkspacePipelinePluginFilePaths,
} from '../../../../src/extension/pipeline/service/cache/invalidation';
import {
  getWorkspacePipelinePluginName,
  getWorkspacePipelineStatusList,
} from '../../../../src/extension/pipeline/service/runtime/plugins';

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
}));

class TestLifecycleFacade extends WorkspacePipelineLifecycleFacade {
  readonly syncPluginOrder = vi.fn();
  readonly getWorkspaceRoot = vi.fn<() => string | undefined>(() => '/workspace');
  readonly persistCache = vi.fn();

  constructor() {
    super({
      subscriptions: [],
      workspaceState: {
        get: vi.fn(),
        update: vi.fn(),
      },
    } as never);
  }

  _registry = {
    list: vi.fn(() => []),
    disposeAll: vi.fn(),
    setPluginOrder: vi.fn(),
  } as unknown as PluginRegistry;
  _cache = { files: {} } as unknown as IWorkspaceAnalysisCache;
  _lastDiscoveredFiles = [
    { absolutePath: '/workspace/src/a.ts', relativePath: 'src/a.ts', extension: '.ts', name: 'a.ts' },
  ] as unknown as IDiscoveredFile[];
  _lastFileAnalysis = new Map([['src/a.ts', { id: 'analysis' }]]) as unknown as Map<
    string,
    IFileAnalysisResult
  >;
  _lastFileConnections = new Map([['src/a.ts', [{ id: 'edge' }]]]) as unknown as Map<
    string,
    IProjectedConnection[]
  >;
  _lastWorkspaceRoot = '/workspace';

  protected override _syncPluginOrder(): void {
    this.syncPluginOrder();
  }

  protected override _getWorkspaceRoot(): string | undefined {
    return this.getWorkspaceRoot();
  }

  protected override _persistCache(): void {
    this.persistCache();
  }
}

describe('pipeline/service/lifecycleFacade', () => {
  const lifecycleState = (
    facade: TestLifecycleFacade,
  ): {
    _lastDiscoveredFiles: IDiscoveredFile[];
    _registry: {
      list: ReturnType<typeof vi.fn>;
      disposeAll: ReturnType<typeof vi.fn>;
    };
  } => facade as unknown as {
    _lastDiscoveredFiles: IDiscoveredFile[];
    _registry: {
      list: ReturnType<typeof vi.fn>;
      disposeAll: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(clearWorkspacePipelineStoredCache).mockReturnValue({ files: { 'src/a.ts': { cached: true } } } as never);
    vi.mocked(getWorkspacePipelineStatusList).mockReturnValue([{ id: 'plugin.a' }] as never);
    vi.mocked(getWorkspacePipelinePluginName).mockReturnValue('TypeScript');
    vi.mocked(invalidateWorkspacePipelineFiles).mockReturnValue(['src/a.ts']);
    vi.mocked(resolveWorkspacePipelinePluginFilePaths).mockReturnValue(['/workspace/src/a.ts']);
  });

  it('returns plugin statuses after syncing plugin order', () => {
    const facade = new TestLifecycleFacade();
    const disabledPlugins = new Set(['plugin.disabled']);

    expect(facade.getPluginStatuses(disabledPlugins)).toEqual([{ id: 'plugin.a' }]);
    expect(facade.syncPluginOrder).toHaveBeenCalledOnce();
    expect(getWorkspacePipelineStatusList).toHaveBeenCalledWith(
      facade._registry,
      disabledPlugins,
      facade._lastDiscoveredFiles,
      facade._lastFileConnections,
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

  it('replaces the cache through the stored-cache helper and logs its messages', () => {
    const facade = new TestLifecycleFacade();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    facade.clearCache();

    expect(clearWorkspacePipelineStoredCache).toHaveBeenCalledWith(
      '/workspace',
      expect.any(Function),
    );
    const onMessage = vi.mocked(clearWorkspacePipelineStoredCache).mock.calls[0][1];
    onMessage('cache cleared');
    expect(logSpy).toHaveBeenCalledWith('cache cleared');
    expect(facade._cache).toEqual({ files: { 'src/a.ts': { cached: true } } });
  });

  it('short-circuits file invalidation when no workspace root exists or no files are provided', () => {
    const facade = new TestLifecycleFacade();
    facade.getWorkspaceRoot.mockReturnValue(undefined);

    expect(facade.invalidateWorkspaceFiles(['/workspace/src/a.ts'])).toEqual([]);
    expect(invalidateWorkspacePipelineFiles).not.toHaveBeenCalled();
  });

  it('returns an empty invalidation set when no file paths are provided even with a workspace root', () => {
    const facade = new TestLifecycleFacade();

    expect(facade.invalidateWorkspaceFiles([])).toEqual([]);
    expect(invalidateWorkspacePipelineFiles).not.toHaveBeenCalled();
  });

  it('invalidates workspace files and persists only when files were removed from the cache', () => {
    const facade = new TestLifecycleFacade();
    const toWorkspaceRelativePath = vi
      .spyOn(
        facade as unknown as {
          _toWorkspaceRelativePath: (workspaceRoot: string, filePath: string) => string | undefined;
        },
        '_toWorkspaceRelativePath',
      )
      .mockReturnValue('src/a.ts');

    expect(facade.invalidateWorkspaceFiles(['/workspace/src/a.ts'])).toEqual(['src/a.ts']);
    expect(invalidateWorkspacePipelineFiles).toHaveBeenCalledWith(
      {
        cache: facade._cache,
        lastFileAnalysis: facade._lastFileAnalysis,
        lastFileConnections: facade._lastFileConnections,
      },
      '/workspace',
      ['/workspace/src/a.ts'],
      expect.any(Function),
    );
    const relativePathResolver = vi.mocked(invalidateWorkspacePipelineFiles).mock.calls[0][3];
    expect(relativePathResolver('/workspace', '/workspace/src/a.ts')).toBe('src/a.ts');
    expect(toWorkspaceRelativePath).toHaveBeenCalledWith('/workspace', '/workspace/src/a.ts');
    expect(facade.persistCache).toHaveBeenCalledOnce();

    vi.mocked(invalidateWorkspacePipelineFiles).mockReturnValueOnce([]);
    expect(facade.invalidateWorkspaceFiles(['/workspace/src/b.ts'])).toEqual([]);
    expect(facade.persistCache).toHaveBeenCalledOnce();
  });

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

  it('disposes the plugin registry', () => {
    const facade = new TestLifecycleFacade();

    facade.dispose();

    expect(lifecycleState(facade)._registry.disposeAll).toHaveBeenCalledOnce();
  });
});
