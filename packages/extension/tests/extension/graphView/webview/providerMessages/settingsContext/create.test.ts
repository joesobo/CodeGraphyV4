import { describe, expect, it, vi } from 'vitest';
import {
  createGraphViewProviderMessageSettingsContext,
} from '../../../../../../src/extension/graphView/webview/providerMessages/settingsContext/create';
import * as repoSettings from '../../../../../../src/extension/repoSettings/current';

vi.mock('../../../../../../src/extension/repoSettings/current', () => ({
  getCodeGraphyConfiguration: vi.fn(),
  updateCodeGraphyConfigurationSilently: vi.fn(() => Promise.resolve()),
}));

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
      dagModeKey: 'dagMode',
      nodeSizeModeKey: 'nodeSizeMode',
    };
    const context = createGraphViewProviderMessageSettingsContext(
      {
        _context: { workspaceState: { update: vi.fn(() => Promise.resolve()) } },
        _dagMode: 'TB',
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
      _dagMode: null,
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
      dagModeKey: 'dagMode',
      nodeSizeModeKey: 'nodeSizeMode',
    };

    const context = createGraphViewProviderMessageSettingsContext(
      source as never,
      dependencies as never,
    );

    await context.updateDagMode('TB' as never);
    await context.updateNodeSizeMode('files' as never);
    await context.updateConfig('showOrphans', false);
    await context.resetAllSettings();

    expect(repoSettings.updateCodeGraphyConfigurationSilently).toHaveBeenCalledWith('dagMode', 'TB');
    expect(repoSettings.updateCodeGraphyConfigurationSilently).toHaveBeenCalledWith(
      'nodeSizeMode',
      'files',
    );
    expect(source._sendMessage).toHaveBeenCalledWith({
      type: 'DAG_MODE_UPDATED',
      payload: { dagMode: 'TB' },
    });
    expect(source._sendMessage).toHaveBeenCalledWith({
      type: 'NODE_SIZE_MODE_UPDATED',
      payload: { nodeSizeMode: 'files' },
    });
    expect(updateConfig).toHaveBeenCalledWith('showOrphans', false);
    expect(captureSettingsSnapshot).toHaveBeenCalledOnce();
    expect(createResetSettingsAction).toHaveBeenCalledOnce();
    expect(executeUndoAction).toHaveBeenCalledWith({ kind: 'reset-settings' });
    expect(context.getMaxFiles()).toBe(500);
    expect(context.getPlaybackSpeed()).toBe(1);
  });

  it('persists disabled plugin updates silently to avoid redundant refresh work', async () => {
    const configuration = {
      get: vi.fn(<T>(_key: string, defaultValue: T) => defaultValue),
      update: vi.fn(() => Promise.resolve()),
    };
    vi.mocked(repoSettings.getCodeGraphyConfiguration).mockReturnValue(configuration as never);

    const context = createGraphViewProviderMessageSettingsContext(
      {
        _context: { workspaceState: { update: vi.fn(() => Promise.resolve()) } },
        _dagMode: null,
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
        dagModeKey: 'dagMode',
        nodeSizeModeKey: 'nodeSizeMode',
      } as never,
    );

    await context.updateConfig('disabledPlugins', ['codegraphy.python']);

    expect(repoSettings.updateCodeGraphyConfigurationSilently).toHaveBeenCalledWith(
      'disabledPlugins',
      ['codegraphy.python'],
    );
    expect(configuration.update).not.toHaveBeenCalled();
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
        _dagMode: null,
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
        dagModeKey: 'dagMode',
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
        _dagMode: null,
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
        dagModeKey: 'dagMode',
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
      _dagMode: null,
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
      dagModeKey: 'dagMode',
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
        _dagMode: null,
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
        dagModeKey: 'dagMode',
        nodeSizeModeKey: 'nodeSizeMode',
      } as never,
    );

    await context.reprocessPluginFiles(['codegraphy.python']);

    expect(invalidatePluginFiles).toHaveBeenCalledWith(['codegraphy.python']);
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
        _dagMode: null,
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
        dagModeKey: 'dagMode',
        nodeSizeModeKey: 'nodeSizeMode',
      } as never,
    );

    await context.reprocessPluginFiles(['codegraphy.python']);

    expect(invalidatePluginFiles).toHaveBeenCalledWith(['codegraphy.python']);
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
        _dagMode: null,
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
        dagModeKey: 'dagMode',
        nodeSizeModeKey: 'nodeSizeMode',
      } as never,
    );

    await context.reprocessPluginFiles(['codegraphy.python']);

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
        _dagMode: 'TB',
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
        dagModeKey: 'dagMode',
        nodeSizeModeKey: 'nodeSizeMode',
      } as never,
    );

    context.sendGraphControls();
    await context.analyzeAndSendData();

    expect(sendGraphControls).toHaveBeenCalledOnce();
    expect(analyzeAndSendData).toHaveBeenCalledOnce();
    expect(context.getDepthMode()).toBe('focused');
    expect(context.getDagMode()).toBe('TB');
    expect(context.getNodeSizeMode()).toBe('files');

    const withoutGraphControls = createGraphViewProviderMessageSettingsContext(
      {
        _context: { workspaceState: { update: vi.fn(() => Promise.resolve()) } },
        _depthMode: null,
        _dagMode: null,
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
        dagModeKey: 'dagMode',
        nodeSizeModeKey: 'nodeSizeMode',
      } as never,
    );

    expect(() => withoutGraphControls.sendGraphControls()).not.toThrow();
  });
});
