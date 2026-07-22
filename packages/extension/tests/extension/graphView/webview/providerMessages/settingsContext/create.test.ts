import { describe, expect, it, vi } from 'vitest';
import {
  createGraphViewProviderMessageSettingsContext,
} from '../../../../../../src/extension/graphView/webview/providerMessages/settingsContext/create';
import * as repoSettings from '../../../../../../src/extension/repoSettings/current';

vi.mock('../../../../../../src/extension/repoSettings/current', () => ({
  getCodeGraphyConfiguration: vi.fn(),
  updateCodeGraphyConfigurationSilently: vi.fn(() => Promise.resolve()),
}));

describe('graph view provider listener settings context configuration', () => {
  it('reads update impact from an active Core plugin runtime', () => {
    const configuration = {
      get: vi.fn(<T>(_key: string, defaultValue: T) => defaultValue),
      update: vi.fn(() => Promise.resolve()),
    };
    vi.mocked(repoSettings.getCodeGraphyConfiguration).mockReturnValue(configuration as never);
    const updateImpact = {
      toggle: 'reanalyze-plugin-files' as const,
      defaultSetting: 'reanalyze-plugin-files' as const,
    };

    const context = createGraphViewProviderMessageSettingsContext(
      {
        _analyzer: {
          registry: {
            get: vi.fn(() => ({ plugin: { updateImpact } })),
          },
        },
        _context: { workspaceState: { update: vi.fn(() => Promise.resolve()) } },
        _nodeSizeMode: 'connections',
        _getPhysicsSettings: vi.fn(() => ({})),
        _sendMessage: vi.fn(),
        _sendAllSettings: vi.fn(),
        _analyzeAndSendData: vi.fn(() => Promise.resolve()),
      } as never,
      {
        workspace: { workspaceFolders: [], getConfiguration: vi.fn() },
        getConfigTarget: vi.fn(() => 'workspace'),
        captureSettingsSnapshot: vi.fn(),
        createResetSettingsAction: vi.fn(),
        executeUndoAction: vi.fn(),
        nodeSizeModeKey: 'nodeSizeMode',
      } as never,
    );

    expect(context.getInstalledPluginUpdateImpact?.('codegraphy.vue')).toEqual(updateImpact);
  });

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

});
