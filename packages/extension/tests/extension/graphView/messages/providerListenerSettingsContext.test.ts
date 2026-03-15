import { describe, expect, it, vi } from 'vitest';
import {
  createGraphViewProviderMessageSettingsContext,
} from '../../../../src/extension/graphView/messages/providerListenerSettingsContext';

describe('graph view provider listener settings context', () => {
  it('reads config values from the codegraphy settings namespace', () => {
    const configuration = {
      get: vi.fn((key: string, defaultValue: unknown) =>
        key === 'maxFiles' ? 250 : defaultValue,
      ),
      update: vi.fn(() => Promise.resolve()),
    };
    const dependencies = {
      workspace: {
        workspaceFolders: [],
        getConfiguration: vi.fn(() => configuration),
      },
      getConfigTarget: vi.fn(() => 'workspace'),
      captureSettingsSnapshot: vi.fn(),
      createResetSettingsAction: vi.fn(),
      executeUndoAction: vi.fn(),
      normalizeFolderNodeColor: vi.fn(color => color),
      defaultFolderNodeColor: '#336699',
      dagModeKey: 'codegraphy.dagMode',
      nodeSizeModeKey: 'codegraphy.nodeSizeMode',
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

    expect(dependencies.workspace.getConfiguration).toHaveBeenCalledWith('codegraphy');
    expect(configuration.get).toHaveBeenCalledWith('maxFiles', 500);
  });

  it('persists mode updates and resets settings through the undoable reset action', async () => {
    const updateConfig = vi.fn(() => Promise.resolve());
    const workspaceStateUpdate = vi.fn(() => Promise.resolve());
    const captureSettingsSnapshot = vi.fn(() => ({ snapshot: true }));
    const createResetSettingsAction = vi.fn(() => ({ kind: 'reset-settings' }));
    const executeUndoAction = vi.fn(() => Promise.resolve());
    const source = {
      _context: {
        workspaceState: {
          update: workspaceStateUpdate,
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
    const dependencies = {
      workspace: {
        workspaceFolders: [{ uri: { fsPath: '/workspace' } }],
        getConfiguration: vi.fn(() => configuration),
      },
      getConfigTarget: vi.fn(() => 'workspace'),
      captureSettingsSnapshot,
      createResetSettingsAction,
      executeUndoAction,
      normalizeFolderNodeColor: vi.fn(color => color),
      defaultFolderNodeColor: '#336699',
      dagModeKey: 'codegraphy.dagMode',
      nodeSizeModeKey: 'codegraphy.nodeSizeMode',
    };

    const context = createGraphViewProviderMessageSettingsContext(
      source as never,
      dependencies as never,
    );

    await context.updateDagMode('TB' as never);
    await context.updateNodeSizeMode('files' as never);
    await context.updateConfig('showOrphans', false);
    await context.resetAllSettings();

    expect(workspaceStateUpdate).toHaveBeenCalledWith('codegraphy.dagMode', 'TB');
    expect(workspaceStateUpdate).toHaveBeenCalledWith('codegraphy.nodeSizeMode', 'files');
    expect(dependencies.workspace.getConfiguration).toHaveBeenCalledWith('codegraphy');
    expect(source._sendMessage).toHaveBeenCalledWith({
      type: 'DAG_MODE_UPDATED',
      payload: { dagMode: 'TB' },
    });
    expect(source._sendMessage).toHaveBeenCalledWith({
      type: 'NODE_SIZE_MODE_UPDATED',
      payload: { nodeSizeMode: 'files' },
    });
    expect(updateConfig).toHaveBeenCalledWith('showOrphans', false, 'workspace');
    expect(captureSettingsSnapshot).toHaveBeenCalledOnce();
    expect(createResetSettingsAction).toHaveBeenCalledOnce();
    expect(executeUndoAction).toHaveBeenCalledWith({ kind: 'reset-settings' });
    expect(context.getMaxFiles()).toBe(500);
    expect(context.getPlaybackSpeed()).toBe(1);
    expect(context.getFolderNodeColor()).toBe('#336699');
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
        getConfiguration: vi.fn(() => ({
          get: vi.fn((_: string, defaultValue: unknown) => defaultValue),
          update: vi.fn(() => Promise.resolve()),
        })),
      },
      getConfigTarget: vi.fn(() => 'workspace'),
      captureSettingsSnapshot: vi.fn(() => ({ snapshot: true })),
      createResetSettingsAction,
      executeUndoAction: vi.fn(() => Promise.resolve()),
      normalizeFolderNodeColor: vi.fn(color => color),
      defaultFolderNodeColor: '#336699',
      dagModeKey: 'codegraphy.dagMode',
      nodeSizeModeKey: 'codegraphy.nodeSizeMode',
    };

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
