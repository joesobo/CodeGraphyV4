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

describe('graph view provider listener settings context reset', () => {
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

});
