import { afterEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import type { NodeSizeMode } from '@/shared/settings/modes';
import { DEFAULT_MAX_FILES } from '../../../../../src/shared/settings/defaults';
import {
  createSettingsSnapshot,
  createSource,
  createUndoableAction,
  resetListenerMocks,
} from './listener.fixture';
import { loadDefaultListenerHarness } from './listenerDefaultHarness';

afterEach(resetListenerMocks);

describe('graph view provider listener settings bridges', () => {
  it('wires default settings-context dependency bridges into the captured listener context', async () => {
    const {
      context,
      source,
      captureSettingsSnapshot,
      ResetSettingsAction,
      execute,
      configurationGet,
      configurationUpdate,
    } = await loadDefaultListenerHarness();

    await context.updateNodeSizeMode('file-size' as NodeSizeMode);
    await context.updateConfig('showOrphans', false);
    await context.resetAllSettings();

    expect(configurationUpdate).toHaveBeenCalledWith(
      'nodeSizeMode',
      'file-size',
      undefined,
    );
    expect(source._sendMessage).toHaveBeenCalledWith({
      type: 'NODE_SIZE_MODE_UPDATED',
      payload: { nodeSizeMode: 'file-size' },
    });
    expect(configurationUpdate).toHaveBeenCalledWith(
      'showOrphans',
      false,
      undefined,
    );
    expect(captureSettingsSnapshot).toHaveBeenCalledTimes(1);
    const captureSettingsSnapshotCall = (
      captureSettingsSnapshot as unknown as { mock: { calls: Array<[unknown, unknown, unknown]> } }
    ).mock.calls[0];
    expect(captureSettingsSnapshotCall).toBeDefined();
    if (!captureSettingsSnapshotCall) {
      throw new Error('expected captureSettingsSnapshot to receive one call');
    }
    const [capturedConfig, capturedPhysics, capturedNodeSizeMode] =
      captureSettingsSnapshotCall as unknown as [unknown, unknown, unknown];
    expect(capturedConfig).toEqual(expect.objectContaining({
      get: expect.any(Function),
      update: expect.any(Function),
      inspect: expect.any(Function),
    }));
    expect(capturedPhysics).toEqual(source._getPhysicsSettings());
    expect(capturedNodeSizeMode).toBe('file-size');
    expect(ResetSettingsAction).toHaveBeenCalledWith(
      createSettingsSnapshot(),
      undefined,
      source._context,
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
    );
    expect(execute).toHaveBeenCalledTimes(1);

    expect(context.getMaxFiles()).toBe(DEFAULT_MAX_FILES);
    expect(context.getNodeSizeMode()).toBe('file-size');
    expect(configurationGet).toHaveBeenCalledWith('maxFiles', DEFAULT_MAX_FILES);
  }, 15_000);

  it('wires the default undo-execution dependency into the settings context', async () => {
    vi.resetModules();

    const execute = vi.fn(() => Promise.resolve());
    let executeUndoActionPromise: Promise<void> | undefined;

    vi.doMock('vscode', () => ({
      workspace: {
        workspaceFolders: undefined,
        getConfiguration: vi.fn(() => ({
          get: vi.fn(),
          update: vi.fn(() => Promise.resolve()),
        })),
      },
      window: {
        showInformationMessage: vi.fn(),
        showOpenDialog: vi.fn(() => Promise.resolve(undefined)),
      },
    }));
    vi.doMock('../../../../../src/extension/graphView/settings/reader', () => ({
      getGraphViewConfigTarget: vi.fn(() => vscode.ConfigurationTarget.Workspace),
    }));
    vi.doMock('../../../../../src/extension/graphView/settings/snapshot', () => ({
      captureGraphViewSettingsSnapshot: vi.fn(() => createSettingsSnapshot()),
    }));
    vi.doMock('../../../../../src/extension/actions/resetSettings', () => ({
      ResetSettingsAction: vi.fn(),
    }));
    vi.doMock('../../../../../src/extension/undoManager', () => ({
      getUndoManager: () => ({ execute }),
    }));
    vi.doMock('../../../../../src/extension/graphView/webview/providerMessages/readContext', () => ({
      createGraphViewProviderMessageReadContext: vi.fn(() => ({})),
    }));
    vi.doMock(
      '../../../../../src/extension/graphView/webview/providerMessages/primaryActions',
      () => ({
        createGraphViewProviderMessagePrimaryActions: vi.fn(() => ({})),
      }),
    );
    vi.doMock(
      '../../../../../src/extension/graphView/webview/providerMessages/settingsContext/create',
      () => ({
        createGraphViewProviderMessageSettingsContext: vi.fn((_source, dependencies) => {
          executeUndoActionPromise = dependencies.executeUndoAction(
            createUndoableAction({ kind: 'reset-settings' }),
          );
          return {};
        }),
      }),
    );
    vi.doMock(
      '../../../../../src/extension/graphView/webview/providerMessages/pluginContext',
      () => ({
        createGraphViewProviderMessagePluginContext: vi.fn(() => ({})),
      }),
    );
    vi.doMock('../../../../../src/extension/graphView/webview/messages/listener', () => ({
      setGraphViewWebviewMessageListener: vi.fn(),
    }));

    const { setGraphViewProviderMessageListener: setListener } = await import(
      '../../../../../src/extension/graphView/webview/providerMessages/listener'
    );

    setListener({ onDidReceiveMessage: vi.fn() } as never, createSource());
    await executeUndoActionPromise;

    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'reset-settings' }),
    );
  }, 15_000);

  it('does not enumerate proposed workspace getters while building default dependencies', async () => {
    vi.resetModules();

    const proposedGetter = vi.fn(() => {
      throw new Error('proposed getter should not be touched');
    });
    const workspace = {
      workspaceFolders: undefined,
      getConfiguration: vi.fn(() => ({
        get: vi.fn(),
        update: vi.fn(() => Promise.resolve()),
      })),
    };

    Object.defineProperty(workspace, 'isAgentSessionsWorkspace', {
      enumerable: true,
      get: proposedGetter,
    });

    vi.doMock('vscode', () => ({
      workspace,
      window: {
        showInformationMessage: vi.fn(),
        showOpenDialog: vi.fn(() => Promise.resolve(undefined)),
      },
      ConfigurationTarget: {
        Workspace: 2,
      },
    }));
    vi.doMock('../../../../../src/extension/graphView/settings/reader', () => ({
      getGraphViewConfigTarget: vi.fn(() => vscode.ConfigurationTarget.Workspace),
    }));
    vi.doMock('../../../../../src/extension/graphView/settings/snapshot', () => ({
      captureGraphViewSettingsSnapshot: vi.fn(() => createSettingsSnapshot()),
    }));
    vi.doMock('../../../../../src/extension/actions/resetSettings', () => ({
      ResetSettingsAction: vi.fn(),
    }));
    vi.doMock('../../../../../src/extension/undoManager', () => ({
      getUndoManager: () => ({ execute: vi.fn(() => Promise.resolve()) }),
    }));
    vi.doMock('../../../../../src/extension/repoSettings/current', () => ({
      getCodeGraphyConfiguration: vi.fn(() => ({
        get: vi.fn(),
        update: vi.fn(() => Promise.resolve()),
      })),
    }));
    vi.doMock('../../../../../src/extension/graphView/webview/messages/listener', () => ({
      setGraphViewWebviewMessageListener: vi.fn(),
    }));

    await expect(import(
      '../../../../../src/extension/graphView/webview/providerMessages/listener'
    )).resolves.toBeDefined();
    expect(proposedGetter).not.toHaveBeenCalled();
  });
});
