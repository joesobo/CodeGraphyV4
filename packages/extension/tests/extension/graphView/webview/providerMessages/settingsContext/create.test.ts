import { describe, expect, it, vi } from 'vitest';
import {
  createGraphViewProviderMessageSettingsContext,
} from '../../../../../../src/extension/graphView/webview/providerMessages/settingsContext/create';
import * as repoSettings from '../../../../../../src/extension/repoSettings/current';
import { DEFAULT_MAX_FILES } from '../../../../../../src/shared/settings/defaults';

vi.mock('../../../../../../src/extension/repoSettings/current', () => ({
  getCodeGraphyConfiguration: vi.fn(),
  updateCodeGraphyConfigurationSilently: vi.fn(() => Promise.resolve()),
}));

function createDeferred<T = void>(): {
  promise: Promise<T>;
  resolve(value: T | PromiseLike<T>): void;
  reject(reason?: unknown): void;
} {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}

describe('graph view provider listener settings context', () => {
  it('reads config values from the codegraphy settings namespace', () => {
    const configuration = {
      get: vi.fn((key: string, defaultValue: unknown) =>
        key === 'maxFiles' ? 250 : defaultValue,
      ),
      update: vi.fn(() => Promise.resolve()),
    };
    vi.mocked(repoSettings.getCodeGraphyConfiguration).mockReturnValue(configuration as never);
    const dependencies = {
      workspace: {
        workspaceFolders: [],
        getConfiguration: vi.fn(),
      },
      getConfigTarget: vi.fn(() => 'workspace'),
      captureSettingsSnapshot: vi.fn(),
      createResetSettingsAction: vi.fn(),
      executeUndoAction: vi.fn(),
      nodeSizeModeKey: 'nodeSizeMode',
    };
    const context = createGraphViewProviderMessageSettingsContext(
      {
        _context: { workspaceState: { update: vi.fn(() => Promise.resolve()) } },
        _nodeSizeMode: 'connections',
        _getPhysicsSettings: vi.fn(() => ({
          repelForce: 1,
          linkDistance: 2,
          linkForce: 3,
          damping: 4,
          centerForce: 5,
        })),
        _sendMessage: vi.fn(),
        _sendAllSettings: vi.fn(),
        _analyzeAndSendData: vi.fn(() => Promise.resolve()),
      } as never,
      dependencies as never,
    );

    expect(context.getConfig('maxFiles', 500)).toBe(250);
    expect(configuration.get).toHaveBeenCalledWith('maxFiles', 500);
  });

  it('persists mode updates and resets settings through the undoable reset action', async () => {
    const updateConfig = vi.fn(() => Promise.resolve());
    vi.mocked(repoSettings.updateCodeGraphyConfigurationSilently).mockClear();
    const captureSettingsSnapshot = vi.fn(() => ({ snapshot: true }));
    const createResetSettingsAction = vi.fn(() => ({ kind: 'reset-settings' }));
    const executeUndoAction = vi.fn(() => Promise.resolve());
    const source = {
      _context: {
        workspaceState: {
          update: vi.fn(() => Promise.resolve()),
        },
      },
      _nodeSizeMode: 'connections',
      _getPhysicsSettings: vi.fn(() => ({
        repelForce: 1,
        linkDistance: 2,
        linkForce: 3,
        damping: 4,
        centerForce: 5,
      })),
      _sendMessage: vi.fn(),
      _sendAllSettings: vi.fn(),
      _analyzeAndSendData: vi.fn(() => Promise.resolve()),
    };
    const configuration = {
      get: vi.fn(<T>(_key: string, defaultValue: T) => defaultValue),
      update: updateConfig,
    };
    vi.mocked(repoSettings.getCodeGraphyConfiguration).mockReturnValue(configuration as never);
    const dependencies = {
      workspace: {
        workspaceFolders: [{ uri: { fsPath: '/workspace' } }],
        getConfiguration: vi.fn(),
      },
      getConfigTarget: vi.fn(() => 'workspace'),
      captureSettingsSnapshot,
      createResetSettingsAction,
      executeUndoAction,
      nodeSizeModeKey: 'nodeSizeMode',
    };

    const context = createGraphViewProviderMessageSettingsContext(
      source as never,
      dependencies as never,
    );

    await context.updateNodeSizeMode('files' as never);
    await context.updateConfig('showOrphans', false);
    await context.resetAllSettings();

    expect(repoSettings.updateCodeGraphyConfigurationSilently).toHaveBeenCalledWith(
      'nodeSizeMode',
      'files',
    );
    expect(source._sendMessage).toHaveBeenCalledWith({
      type: 'NODE_SIZE_MODE_UPDATED',
      payload: { nodeSizeMode: 'files' },
    });
    expect(updateConfig).toHaveBeenCalledWith('showOrphans', false);
    expect(captureSettingsSnapshot).toHaveBeenCalledOnce();
    expect(createResetSettingsAction).toHaveBeenCalledOnce();
    expect(executeUndoAction).toHaveBeenCalledWith({ kind: 'reset-settings' });
    expect(context.getMaxFiles()).toBe(DEFAULT_MAX_FILES);
  });

  it('persists workspace plugin updates silently to avoid redundant refresh work', async () => {
    const configuration = {
      get: vi.fn(<T>(_key: string, defaultValue: T) => defaultValue),
      update: vi.fn(() => Promise.resolve()),
    };
    vi.mocked(repoSettings.getCodeGraphyConfiguration).mockReturnValue(configuration as never);

    const context = createGraphViewProviderMessageSettingsContext(
      {
        _context: { workspaceState: { update: vi.fn(() => Promise.resolve()) } },
        _nodeSizeMode: 'connections',
        _getPhysicsSettings: vi.fn(() => ({
          repelForce: 1,
          linkDistance: 2,
          linkForce: 3,
          damping: 4,
          centerForce: 5,
        })),
        _sendMessage: vi.fn(),
        _sendAllSettings: vi.fn(),
        _analyzeAndSendData: vi.fn(() => Promise.resolve()),
      } as never,
      {
        workspace: {
          workspaceFolders: [],
          getConfiguration: vi.fn(),
        },
        getConfigTarget: vi.fn(() => 'workspace'),
        captureSettingsSnapshot: vi.fn(() => ({ snapshot: true })),
        createResetSettingsAction: vi.fn(),
        executeUndoAction: vi.fn(() => Promise.resolve()),
        nodeSizeModeKey: 'nodeSizeMode',
      } as never,
    );

    const plugins = [{ package: '@codegraphy-dev/plugin-vue' }];
    await context.updateConfig('plugins', plugins);

    expect(repoSettings.updateCodeGraphyConfigurationSilently).toHaveBeenCalledWith(
      'plugins',
      plugins,
    );
    expect(configuration.update).not.toHaveBeenCalled();
  });

  it('delegates graph scope hydration when the provider exposes cached hydration', async () => {
    vi.mocked(repoSettings.getCodeGraphyConfiguration).mockReturnValue({
      get: vi.fn((_: string, defaultValue: unknown) => defaultValue),
      update: vi.fn(() => Promise.resolve()),
    } as never);
    const hydrateGraphScope = vi.fn(() => Promise.resolve(true));

    const context = createGraphViewProviderMessageSettingsContext(
      {
        _context: { workspaceState: { update: vi.fn(() => Promise.resolve()) } },
        _nodeSizeMode: 'connections',
        _getPhysicsSettings: vi.fn(() => ({
          repelForce: 1,
          linkDistance: 2,
          linkForce: 3,
          damping: 4,
          centerForce: 5,
        })),
        _sendMessage: vi.fn(),
        _sendAllSettings: vi.fn(),
        _analyzeAndSendData: vi.fn(() => Promise.resolve()),
        hydrateGraphScope,
      } as never,
      {
        workspace: {
          workspaceFolders: [],
          getConfiguration: vi.fn(),
        },
        getConfigTarget: vi.fn(() => 'workspace'),
        captureSettingsSnapshot: vi.fn(() => ({ snapshot: true })),
        createResetSettingsAction: vi.fn(),
        executeUndoAction: vi.fn(() => Promise.resolve()),
        nodeSizeModeKey: 'nodeSizeMode',
      } as never,
    );

    await expect(context.hydrateGraphScope()).resolves.toBe(true);

    expect(hydrateGraphScope).toHaveBeenCalledOnce();
  });

  it('reports cache hydration unavailable when the provider cannot hydrate graph scope', async () => {
    vi.mocked(repoSettings.getCodeGraphyConfiguration).mockReturnValue({
      get: vi.fn((_: string, defaultValue: unknown) => defaultValue),
      update: vi.fn(() => Promise.resolve()),
    } as never);

    const context = createGraphViewProviderMessageSettingsContext(
      {
        _context: { workspaceState: { update: vi.fn(() => Promise.resolve()) } },
        _nodeSizeMode: 'connections',
        _getPhysicsSettings: vi.fn(() => ({
          repelForce: 1,
          linkDistance: 2,
          linkForce: 3,
          damping: 4,
          centerForce: 5,
        })),
        _sendMessage: vi.fn(),
        _sendAllSettings: vi.fn(),
        _analyzeAndSendData: vi.fn(() => Promise.resolve()),
      } as never,
      {
        workspace: {
          workspaceFolders: [],
          getConfiguration: vi.fn(),
        },
        getConfigTarget: vi.fn(() => 'workspace'),
        captureSettingsSnapshot: vi.fn(() => ({ snapshot: true })),
        createResetSettingsAction: vi.fn(),
        executeUndoAction: vi.fn(() => Promise.resolve()),
        nodeSizeModeKey: 'nodeSizeMode',
      } as never,
    );

    await expect(context.hydrateGraphScope()).resolves.toBe(false);
  });

  it('keeps the analyzer initialized after reloading workspace plugins', async () => {
    vi.mocked(repoSettings.getCodeGraphyConfiguration).mockReturnValue({
      get: vi.fn((_: string, defaultValue: unknown) => defaultValue),
      update: vi.fn(() => Promise.resolve()),
    } as never);

    const source = {
      _context: { workspaceState: { update: vi.fn(() => Promise.resolve()) } },
      _analyzerInitialized: true,
      _analyzerInitPromise: Promise.resolve(),
      _analyzer: {
        reloadWorkspacePlugins: vi.fn(() => Promise.resolve()),
      },
      _nodeSizeMode: 'connections',
      _getPhysicsSettings: vi.fn(() => ({
        repelForce: 1,
        linkDistance: 2,
        linkForce: 3,
        damping: 4,
        centerForce: 5,
      })),
      _sendMessage: vi.fn(),
      _sendAllSettings: vi.fn(),
      _analyzeAndSendData: vi.fn(() => Promise.resolve()),
    };

    const context = createGraphViewProviderMessageSettingsContext(
      source as never,
      {
        workspace: {
          workspaceFolders: [],
          getConfiguration: vi.fn(),
        },
        getConfigTarget: vi.fn(() => 'workspace'),
        captureSettingsSnapshot: vi.fn(() => ({ snapshot: true })),
        createResetSettingsAction: vi.fn(),
        executeUndoAction: vi.fn(() => Promise.resolve()),
        nodeSizeModeKey: 'nodeSizeMode',
      } as never,
    );

    await context.reloadWorkspacePlugins();

    expect(source._analyzer.reloadWorkspacePlugins).toHaveBeenCalledOnce();
    expect(source._analyzerInitialized).toBe(true);
    expect(source._analyzerInitPromise).toBeUndefined();
  });

  it('exposes the in-flight workspace plugin reload as the analyzer init promise', async () => {
    vi.mocked(repoSettings.getCodeGraphyConfiguration).mockReturnValue({
      get: vi.fn((_: string, defaultValue: unknown) => defaultValue),
      update: vi.fn(() => Promise.resolve()),
    } as never);
    const reload = createDeferred();

    const source = {
      _context: { workspaceState: { update: vi.fn(() => Promise.resolve()) } },
      _analyzerInitialized: true,
      _analyzerInitPromise: undefined as Promise<void> | undefined,
      _analyzer: {
        reloadWorkspacePlugins: vi.fn(() => reload.promise),
      },
      _nodeSizeMode: 'connections',
      _getPhysicsSettings: vi.fn(() => ({
        repelForce: 1,
        linkDistance: 2,
        linkForce: 3,
        damping: 4,
        centerForce: 5,
      })),
      _sendMessage: vi.fn(),
      _sendAllSettings: vi.fn(),
      _analyzeAndSendData: vi.fn(() => Promise.resolve()),
    };

    const context = createGraphViewProviderMessageSettingsContext(
      source as never,
      {
        workspace: {
          workspaceFolders: [],
          getConfiguration: vi.fn(),
        },
        getConfigTarget: vi.fn(() => 'workspace'),
        captureSettingsSnapshot: vi.fn(() => ({ snapshot: true })),
        createResetSettingsAction: vi.fn(),
        executeUndoAction: vi.fn(() => Promise.resolve()),
        nodeSizeModeKey: 'nodeSizeMode',
      } as never,
    );

    const pendingReload = context.reloadWorkspacePlugins();

    expect(source._analyzerInitialized).toBe(false);
    expect(source._analyzerInitPromise).toBe(pendingReload);

    reload.resolve(undefined);
    await pendingReload;

    expect(source._analyzerInitialized).toBe(true);
    expect(source._analyzerInitPromise).toBeUndefined();
  });

  it('persists filter and max-file changes silently so they do not auto-reindex', async () => {
    const configuration = {
      get: vi.fn(<T>(_key: string, defaultValue: T) => defaultValue),
      update: vi.fn(() => Promise.resolve()),
    };
    vi.mocked(repoSettings.getCodeGraphyConfiguration).mockReturnValue(configuration as never);
    vi.mocked(repoSettings.updateCodeGraphyConfigurationSilently).mockClear();

    const context = createGraphViewProviderMessageSettingsContext(
      {
        _context: { workspaceState: { update: vi.fn(() => Promise.resolve()) } },
        _nodeSizeMode: 'connections',
        _getPhysicsSettings: vi.fn(() => ({
          repelForce: 1,
          linkDistance: 2,
          linkForce: 3,
          damping: 4,
          centerForce: 5,
        })),
        _sendMessage: vi.fn(),
        _sendAllSettings: vi.fn(),
        _analyzeAndSendData: vi.fn(() => Promise.resolve()),
      } as never,
      {
        workspace: {
          workspaceFolders: [],
          getConfiguration: vi.fn(),
        },
        getConfigTarget: vi.fn(() => 'workspace'),
        captureSettingsSnapshot: vi.fn(() => ({ snapshot: true })),
        createResetSettingsAction: vi.fn(),
        executeUndoAction: vi.fn(() => Promise.resolve()),
        nodeSizeModeKey: 'nodeSizeMode',
      } as never,
    );

    await context.updateConfig('filterPatterns', ['dist/**']);
    await context.updateConfig('maxFiles', 250);

    expect(repoSettings.updateCodeGraphyConfigurationSilently).toHaveBeenCalledWith(
      'filterPatterns',
      ['dist/**'],
    );
    expect(repoSettings.updateCodeGraphyConfigurationSilently).toHaveBeenCalledWith(
      'maxFiles',
      250,
    );
    expect(configuration.update).not.toHaveBeenCalled();
  });

  it('keeps show-orphans updates on the normal configuration event path', async () => {
    const configuration = {
      get: vi.fn(<T>(_key: string, defaultValue: T) => defaultValue),
      update: vi.fn(() => Promise.resolve()),
    };
    vi.mocked(repoSettings.getCodeGraphyConfiguration).mockReturnValue(configuration as never);

    const context = createGraphViewProviderMessageSettingsContext(
      {
        _context: { workspaceState: { update: vi.fn(() => Promise.resolve()) } },
        _nodeSizeMode: 'connections',
        _getPhysicsSettings: vi.fn(() => ({
          repelForce: 1,
          linkDistance: 2,
          linkForce: 3,
          damping: 4,
          centerForce: 5,
        })),
        _sendMessage: vi.fn(),
        _sendAllSettings: vi.fn(),
        _analyzeAndSendData: vi.fn(() => Promise.resolve()),
      } as never,
      {
        workspace: {
          workspaceFolders: [],
          getConfiguration: vi.fn(),
        },
        getConfigTarget: vi.fn(() => 'workspace'),
        captureSettingsSnapshot: vi.fn(() => ({ snapshot: true })),
        createResetSettingsAction: vi.fn(),
        executeUndoAction: vi.fn(() => Promise.resolve()),
        nodeSizeModeKey: 'nodeSizeMode',
      } as never,
    );

    await context.updateConfig('showOrphans', false);

    expect(configuration.update).toHaveBeenCalledWith('showOrphans', false);
    expect(repoSettings.updateCodeGraphyConfigurationSilently).not.toHaveBeenCalledWith(
      'showOrphans',
      false,
    );
  });

  it('wires reset callbacks to resend settings, store node size mode, and reanalyze', async () => {
    const sendAllSettings = vi.fn();
    const analyzeAndSendData = vi.fn(() => Promise.resolve());
    const createResetSettingsAction = vi.fn(
      (
        _snapshot,
        _target,
        _context,
        resendSettings: () => void,
        setNodeSizeMode: (mode: string) => void,
        rerunAnalysis: () => Promise<void>,
      ) => {
        resendSettings();
        setNodeSizeMode('files');
        void rerunAnalysis();
        return { kind: 'reset-settings' };
      },
    );
    const source = {
      _context: {
        workspaceState: {
          update: vi.fn(() => Promise.resolve()),
        },
      },
      _nodeSizeMode: 'connections',
      _getPhysicsSettings: vi.fn(() => ({
        repelForce: 1,
        linkDistance: 2,
        linkForce: 3,
        damping: 4,
        centerForce: 5,
      })),
      _sendMessage: vi.fn(),
      _sendAllSettings: sendAllSettings,
      _analyzeAndSendData: analyzeAndSendData,
    };
    const dependencies = {
      workspace: {
        workspaceFolders: [],
        getConfiguration: vi.fn(),
      },
      getConfigTarget: vi.fn(() => 'workspace'),
      captureSettingsSnapshot: vi.fn(() => ({ snapshot: true })),
      createResetSettingsAction,
      executeUndoAction: vi.fn(() => Promise.resolve()),
      nodeSizeModeKey: 'nodeSizeMode',
    };

    vi.mocked(repoSettings.getCodeGraphyConfiguration).mockReturnValue({
      get: vi.fn((_: string, defaultValue: unknown) => defaultValue),
      update: vi.fn(() => Promise.resolve()),
    } as never);

    const context = createGraphViewProviderMessageSettingsContext(
      source as never,
      dependencies as never,
    );

    await context.resetAllSettings();

    expect(createResetSettingsAction).toHaveBeenCalledOnce();
    expect(sendAllSettings).toHaveBeenCalledOnce();
    expect(source._nodeSizeMode).toBe('files');
    expect(analyzeAndSendData).toHaveBeenCalledOnce();
  });

  it('reprocesses only invalidated plugin files when the pipeline reports affected files', async () => {
    vi.mocked(repoSettings.getCodeGraphyConfiguration).mockReturnValue({
      get: vi.fn((_: string, defaultValue: unknown) => defaultValue),
      update: vi.fn(() => Promise.resolve()),
    } as never);

    const refreshChangedFiles = vi.fn(() => Promise.resolve());
    const analyzeAndSendData = vi.fn(() => Promise.resolve());
    const invalidatePluginFiles = vi.fn(() => ['src/a.ts', 'src/b.ts']);

    const context = createGraphViewProviderMessageSettingsContext(
      {
        _context: { workspaceState: { update: vi.fn(() => Promise.resolve()) } },
        _nodeSizeMode: 'connections',
        _getPhysicsSettings: vi.fn(() => ({
          repelForce: 1,
          linkDistance: 2,
          linkForce: 3,
          damping: 4,
          centerForce: 5,
        })),
        _sendMessage: vi.fn(),
        _sendAllSettings: vi.fn(),
        _analyzeAndSendData: analyzeAndSendData,
        refreshChangedFiles,
        invalidatePluginFiles,
      } as never,
      {
        workspace: {
          workspaceFolders: [],
          getConfiguration: vi.fn(),
        },
        getConfigTarget: vi.fn(() => 'workspace'),
        captureSettingsSnapshot: vi.fn(() => ({ snapshot: true })),
        createResetSettingsAction: vi.fn(),
        executeUndoAction: vi.fn(() => Promise.resolve()),
        nodeSizeModeKey: 'nodeSizeMode',
      } as never,
    );

    await context.reprocessPluginFiles(['codegraphy.vue']);

    expect(invalidatePluginFiles).toHaveBeenCalledWith(['codegraphy.vue']);
    expect(refreshChangedFiles).toHaveBeenCalledWith(['src/a.ts', 'src/b.ts']);
    expect(analyzeAndSendData).not.toHaveBeenCalled();
  });

  it('skips reanalysis when plugin invalidation reports no affected files', async () => {
    vi.mocked(repoSettings.getCodeGraphyConfiguration).mockReturnValue({
      get: vi.fn((_: string, defaultValue: unknown) => defaultValue),
      update: vi.fn(() => Promise.resolve()),
    } as never);

    const refreshChangedFiles = vi.fn(() => Promise.resolve());
    const analyzeAndSendData = vi.fn(() => Promise.resolve());
    const invalidatePluginFiles = vi.fn(() => []);

    const context = createGraphViewProviderMessageSettingsContext(
      {
        _context: { workspaceState: { update: vi.fn(() => Promise.resolve()) } },
        _nodeSizeMode: 'connections',
        _getPhysicsSettings: vi.fn(() => ({
          repelForce: 1,
          linkDistance: 2,
          linkForce: 3,
          damping: 4,
          centerForce: 5,
        })),
        _sendMessage: vi.fn(),
        _sendAllSettings: vi.fn(),
        _analyzeAndSendData: analyzeAndSendData,
        refreshChangedFiles,
        invalidatePluginFiles,
      } as never,
      {
        workspace: {
          workspaceFolders: [],
          getConfiguration: vi.fn(),
        },
        getConfigTarget: vi.fn(() => 'workspace'),
        captureSettingsSnapshot: vi.fn(() => ({ snapshot: true })),
        createResetSettingsAction: vi.fn(),
        executeUndoAction: vi.fn(() => Promise.resolve()),
        nodeSizeModeKey: 'nodeSizeMode',
      } as never,
    );

    await context.reprocessPluginFiles(['codegraphy.vue']);

    expect(invalidatePluginFiles).toHaveBeenCalledWith(['codegraphy.vue']);
    expect(refreshChangedFiles).not.toHaveBeenCalled();
    expect(analyzeAndSendData).not.toHaveBeenCalled();
  });

  it('falls back to full reanalysis when plugin invalidation is unavailable', async () => {
    vi.mocked(repoSettings.getCodeGraphyConfiguration).mockReturnValue({
      get: vi.fn((_: string, defaultValue: unknown) => defaultValue),
      update: vi.fn(() => Promise.resolve()),
    } as never);

    const refreshChangedFiles = vi.fn(() => Promise.resolve());
    const analyzeAndSendData = vi.fn(() => Promise.resolve());

    const context = createGraphViewProviderMessageSettingsContext(
      {
        _context: { workspaceState: { update: vi.fn(() => Promise.resolve()) } },
        _nodeSizeMode: 'connections',
        _getPhysicsSettings: vi.fn(() => ({
          repelForce: 1,
          linkDistance: 2,
          linkForce: 3,
          damping: 4,
          centerForce: 5,
        })),
        _sendMessage: vi.fn(),
        _sendAllSettings: vi.fn(),
        _analyzeAndSendData: analyzeAndSendData,
        refreshChangedFiles,
      } as never,
      {
        workspace: {
          workspaceFolders: [],
          getConfiguration: vi.fn(),
        },
        getConfigTarget: vi.fn(() => 'workspace'),
        captureSettingsSnapshot: vi.fn(() => ({ snapshot: true })),
        createResetSettingsAction: vi.fn(),
        executeUndoAction: vi.fn(() => Promise.resolve()),
        nodeSizeModeKey: 'nodeSizeMode',
      } as never,
    );

    await context.reprocessPluginFiles(['codegraphy.vue']);

    expect(refreshChangedFiles).not.toHaveBeenCalled();
    expect(analyzeAndSendData).toHaveBeenCalledOnce();
  });

  it('forwards graph-control callbacks and exposes the current mode getters', async () => {
    vi.mocked(repoSettings.getCodeGraphyConfiguration).mockReturnValue({
      get: vi.fn((_: string, defaultValue: unknown) => defaultValue),
      update: vi.fn(() => Promise.resolve()),
    } as never);

    const sendGraphControls = vi.fn();
    const analyzeAndSendData = vi.fn(() => Promise.resolve());

    const context = createGraphViewProviderMessageSettingsContext(
      {
        _context: { workspaceState: { update: vi.fn(() => Promise.resolve()) } },
        _depthMode: 'focused',
        _nodeSizeMode: 'files',
        _getPhysicsSettings: vi.fn(() => ({
          repelForce: 1,
          linkDistance: 2,
          linkForce: 3,
          damping: 4,
          centerForce: 5,
        })),
        _sendGraphControls: sendGraphControls,
        _sendMessage: vi.fn(),
        _sendAllSettings: vi.fn(),
        _analyzeAndSendData: analyzeAndSendData,
      } as never,
      {
        workspace: {
          workspaceFolders: [],
          getConfiguration: vi.fn(),
        },
        getConfigTarget: vi.fn(() => 'workspace'),
        captureSettingsSnapshot: vi.fn(() => ({ snapshot: true })),
        createResetSettingsAction: vi.fn(),
        executeUndoAction: vi.fn(() => Promise.resolve()),
        nodeSizeModeKey: 'nodeSizeMode',
      } as never,
    );

    context.sendGraphControls();
    await context.analyzeAndSendData();

    expect(sendGraphControls).toHaveBeenCalledOnce();
    expect(analyzeAndSendData).toHaveBeenCalledOnce();
    expect(context.getDepthMode()).toBe('focused');
    expect(context.getNodeSizeMode()).toBe('files');

    const withoutGraphControls = createGraphViewProviderMessageSettingsContext(
      {
        _context: { workspaceState: { update: vi.fn(() => Promise.resolve()) } },
        _depthMode: null,
        _nodeSizeMode: 'connections',
        _getPhysicsSettings: vi.fn(() => ({
          repelForce: 1,
          linkDistance: 2,
          linkForce: 3,
          damping: 4,
          centerForce: 5,
        })),
        _sendMessage: vi.fn(),
        _sendAllSettings: vi.fn(),
        _analyzeAndSendData: vi.fn(() => Promise.resolve()),
      } as never,
      {
        workspace: {
          workspaceFolders: [],
          getConfiguration: vi.fn(),
        },
        getConfigTarget: vi.fn(() => 'workspace'),
        captureSettingsSnapshot: vi.fn(() => ({ snapshot: true })),
        createResetSettingsAction: vi.fn(),
        executeUndoAction: vi.fn(() => Promise.resolve()),
        nodeSizeModeKey: 'nodeSizeMode',
      } as never,
    );

    expect(() => withoutGraphControls.sendGraphControls()).not.toThrow();
  });
});
