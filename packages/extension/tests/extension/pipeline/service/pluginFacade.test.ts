import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FileDiscovery } from '@codegraphy-dev/core';
import type { PluginRegistry } from '../../../../src/core/plugins/registry/manager';
import type { Configuration } from '../../../../src/extension/config/reader';
import { hasWorkspacePipelineIndex } from '../../../../src/extension/pipeline/service/cache/index';
import { getWorkspacePipelineIndexStatus } from '../../../../src/extension/pipeline/service/indexStatus';
import { WorkspacePipelinePluginFacade } from '../../../../src/extension/pipeline/service/pluginFacade';
import {
  getEffectiveCustomFilterPatterns,
  getEffectivePluginFilterPatterns,
  getPipelinePluginFilterGroups,
  getPipelinePluginFilterPatterns,
  initializeWorkspacePipelinePlugins,
  queueWorkspacePipelinePluginReload,
  queueWorkspacePipelinePluginSync,
} from '../../../../src/extension/pipeline/service/pluginState';

vi.mock('../../../../src/extension/pipeline/service/cache/index', () => ({
  hasWorkspacePipelineIndex: vi.fn(),
}));

vi.mock('../../../../src/extension/pipeline/service/indexStatus', () => ({
  getWorkspacePipelineIndexStatus: vi.fn(),
}));

vi.mock('../../../../src/extension/pipeline/service/pluginState', () => ({
  getEffectiveCustomFilterPatterns: vi.fn(),
  getEffectivePluginFilterPatterns: vi.fn(),
  getPipelinePluginFilterGroups: vi.fn(),
  getPipelinePluginFilterPatterns: vi.fn(),
  initializeWorkspacePipelinePlugins: vi.fn(),
  queueWorkspacePipelinePluginReload: vi.fn(),
  queueWorkspacePipelinePluginSync: vi.fn(),
}));

vi.mock('vscode', () => ({
  workspace: {
    workspaceFolders: [{ uri: { fsPath: '/workspace' } }],
    getConfiguration: vi.fn(() => ({
      get: vi.fn(),
      inspect: vi.fn(),
      update: vi.fn(),
    })),
    createFileSystemWatcher: vi.fn(),
    onDidChangeConfiguration: vi.fn(),
    onDidSaveTextDocument: vi.fn(),
  },
}));

class TestPluginFacade extends WorkspacePipelinePluginFacade {
  readonly getWorkspaceRoot = vi.fn<() => string | undefined>(() => '/workspace');

  _config = { id: 'config' } as unknown as Configuration;
  _discovery = { kind: 'discovery' } as unknown as FileDiscovery;
  _registry = {
    id: 'registry',
    disposeAll: vi.fn(),
  } as unknown as PluginRegistry;

  constructor() {
    super({
      extensionUri: {
        fsPath: '/extension',
      },
      subscriptions: [],
      workspaceState: {
        get: vi.fn(),
        update: vi.fn(),
      },
    } as never);
  }

  effectiveCustomFilterPatterns(filterPatterns: string[]): string[] {
    return this._getEffectiveCustomFilterPatterns(filterPatterns);
  }

  effectivePluginFilterPatterns(disabledPlugins: ReadonlySet<string>): string[] {
    return this._getEffectivePluginFilterPatterns(disabledPlugins);
  }

  disposePluginHost(): void {
    this._disposeWorkspacePluginHost();
  }

  protected override _getPluginSignature(): string | null {
    return 'plugin-signature';
  }

  protected override _getSettingsSignature(): string {
    return 'settings-signature';
  }

  protected override _getWorkspaceRoot(): string | undefined {
    return this.getWorkspaceRoot();
  }
}

describe('extension/pipeline/service/pluginFacade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPipelinePluginFilterPatterns).mockReturnValue(['plugin-filter']);
    vi.mocked(getPipelinePluginFilterGroups).mockReturnValue([{
      patterns: ['generated/**'],
      pluginId: 'plugin.disabled',
      pluginName: 'Disabled Plugin',
    }]);
    vi.mocked(getEffectiveCustomFilterPatterns).mockReturnValue(['custom-filter']);
    vi.mocked(getEffectivePluginFilterPatterns).mockReturnValue(['effective-plugin-filter']);
    vi.mocked(hasWorkspacePipelineIndex).mockReturnValue(true);
    vi.mocked(getWorkspacePipelineIndexStatus).mockReturnValue({
      freshness: 'fresh',
      detail: 'Index is fresh.',
    });
    vi.mocked(queueWorkspacePipelinePluginReload).mockImplementation((_queue, _registry, reload) => {
      const reloadResult = Promise.resolve(reload()).then(() => undefined);
      return {
        nextQueue: reloadResult,
        reload: reloadResult,
      };
    });
    vi.mocked(queueWorkspacePipelinePluginSync).mockImplementation((_queue, _registry, getWorkspaceRoot) => {
      const sync = Promise.resolve(getWorkspaceRoot()).then(() => undefined);
      return {
        nextQueue: sync,
        sync,
      };
    });
  });

  it('initializes and reloads workspace plugins through callback-based helpers', async () => {
    const facade = new TestPluginFacade();
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await facade.initialize();

    expect(initializeWorkspacePipelinePlugins).toHaveBeenCalledWith(
      facade._registry,
      expect.any(Function),
      '/extension',
    );
    expect(vi.mocked(initializeWorkspacePipelinePlugins).mock.calls[0][1]()).toBe('/workspace');
    expect(log).toHaveBeenCalledWith('[CodeGraphy] WorkspacePipeline initialized');

    vi.mocked(initializeWorkspacePipelinePlugins).mockClear();
    await facade.reloadWorkspacePlugins();

    expect(queueWorkspacePipelinePluginReload).toHaveBeenCalledWith(
      expect.any(Promise),
      facade._registry,
      expect.any(Function),
      expect.any(Function),
    );
    expect(initializeWorkspacePipelinePlugins).toHaveBeenCalledWith(
      facade._registry,
      expect.any(Function),
      '/extension',
    );
  });

  it('cleans partial initialization when disposal happens before an initialization error', async () => {
    let markInitializationStarted!: () => void;
    let rejectInitialization!: (error: Error) => void;
    const initializationStarted = new Promise<void>((resolve) => {
      markInitializationStarted = resolve;
    });
    const initializationGate = new Promise<void>((_resolve, reject) => {
      rejectInitialization = reject;
    });
    vi.mocked(initializeWorkspacePipelinePlugins).mockImplementationOnce(async () => {
      markInitializationStarted();
      await initializationGate;
    });
    const facade = new TestPluginFacade();

    const initialization = facade.initialize();
    await initializationStarted;
    facade.disposePluginHost();
    rejectInitialization(new Error('initialization failed'));

    await expect(initialization).rejects.toThrow('initialization failed');
    expect(facade._registry.disposeAll).toHaveBeenCalledTimes(2);
  });

  it('syncs workspace plugins with the current workspace-root callback', async () => {
    const facade = new TestPluginFacade();

    await facade.syncWorkspacePlugins();

    expect(queueWorkspacePipelinePluginSync).toHaveBeenCalledWith(
      expect.any(Promise),
      facade._registry,
      expect.any(Function),
      expect.any(Function),
      '/extension',
    );
    expect(facade.getWorkspaceRoot).toHaveBeenCalledOnce();
  });

  it('delegates plugin filters and effective filter resolution to plugin state helpers', () => {
    const facade = new TestPluginFacade();
    const disabledPlugins = new Set(['plugin.disabled']);

    expect(facade.getPluginFilterPatterns(disabledPlugins)).toEqual(['plugin-filter']);
    expect(getPipelinePluginFilterPatterns).toHaveBeenCalledWith(facade._registry, disabledPlugins);

    expect(facade.getPluginFilterGroups(disabledPlugins)).toEqual([{
      patterns: ['generated/**'],
      pluginId: 'plugin.disabled',
      pluginName: 'Disabled Plugin',
    }]);
    expect(getPipelinePluginFilterGroups).toHaveBeenCalledWith(facade._registry, disabledPlugins);

    expect(facade.effectiveCustomFilterPatterns(['dist/**'])).toEqual(['custom-filter']);
    expect(getEffectiveCustomFilterPatterns).toHaveBeenCalledWith(facade._config, ['dist/**']);

    expect(facade.effectivePluginFilterPatterns(disabledPlugins)).toEqual(['effective-plugin-filter']);
    expect(getEffectivePluginFilterPatterns).toHaveBeenCalledWith(
      facade._registry,
      facade._config,
      disabledPlugins,
    );
  });

  it('delegates index checks and index status inputs through current facade state', () => {
    const facade = new TestPluginFacade();

    expect(facade.hasIndex()).toBe(true);
    expect(hasWorkspacePipelineIndex).toHaveBeenCalledWith('/workspace');

    expect(facade.getIndexStatus()).toEqual({
      freshness: 'fresh',
      detail: 'Index is fresh.',
    });

    const statusInput = vi.mocked(getWorkspacePipelineIndexStatus).mock.calls[0][0];
    expect(statusInput.pluginSignature).toBe('plugin-signature');
    expect(statusInput.settingsSignature).toBe('settings-signature');
    expect(statusInput.workspaceRoot).toBe('/workspace');
    expect(statusInput.hasIndex()).toBe(true);
    expect(hasWorkspacePipelineIndex).toHaveBeenLastCalledWith('/workspace');
  });
});
