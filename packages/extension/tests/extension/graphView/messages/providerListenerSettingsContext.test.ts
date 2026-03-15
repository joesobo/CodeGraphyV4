import { describe, expect, it, vi } from 'vitest';
import {
  createGraphViewProviderMessageSettingsContext,
} from '../../../../src/extension/graphView/messages/providerListenerSettingsContext';

describe('graph view provider listener settings context', () => {
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
});
