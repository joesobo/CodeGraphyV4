import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  vi.doUnmock('vscode');
  vi.doUnmock('../../../../../src/extension/repoSettings/current');
  vi.doUnmock('../../../../../src/extension/graphView/settings/reader');
  vi.doUnmock('../../../../../src/extension/graphView/settings/snapshot');
  vi.doUnmock('../../../../../src/extension/actions/resetSettings');
  vi.doUnmock('../../../../../src/extension/undoManager');
  vi.doUnmock('../../../../../src/extension/graphView/webview/providerMessages/context');
  vi.doUnmock('../../../../../src/extension/graphView/webview/messages/listener');
});

describe('graph view provider listener defaults', () => {
  it('routes codegraphy configuration through repo settings and other sections through vscode workspace', async () => {
    const codeGraphyConfig = { get: vi.fn(), update: vi.fn() };
    const otherConfig = { get: vi.fn(), update: vi.fn() };
    const getCodeGraphyConfiguration = vi.fn(() => codeGraphyConfig);
    const getConfiguration = vi.fn(() => otherConfig);

    vi.doMock('vscode', () => ({
      workspace: {
        workspaceFolders: [{ name: 'workspace' }],
        getConfiguration,
      },
      window: {},
      ConfigurationTarget: { Workspace: 2 },
    }));
    vi.doMock('../../../../../src/extension/repoSettings/current', () => ({
      getCodeGraphyConfiguration,
    }));

    const { DEFAULT_DEPENDENCIES } = await import(
      '../../../../../src/extension/graphView/webview/providerMessages/listener'
    );

    expect(DEFAULT_DEPENDENCIES.workspace.workspaceFolders).toEqual([{ name: 'workspace' }]);
    expect(DEFAULT_DEPENDENCIES.workspace.getConfiguration('codegraphy')).toBe(codeGraphyConfig);
    expect(DEFAULT_DEPENDENCIES.workspace.getConfiguration('editor')).toBe(otherConfig);
    expect(getCodeGraphyConfiguration).toHaveBeenCalledOnce();
    expect(getConfiguration).toHaveBeenCalledWith('editor');
  });

  it('delegates default helper functions through the local adapters', async () => {
    const getGraphViewConfigTarget = vi.fn(() => 'workspace-target');
    const captureGraphViewSettingsSnapshot = vi.fn(() => ({ legends: [] }));
    const resetSettingsAction = { description: 'reset', execute: vi.fn(), undo: vi.fn() };
    const ResetSettingsAction = vi.fn(() => resetSettingsAction);
    const execute = vi.fn();

    vi.doMock('vscode', () => ({
      workspace: {
        workspaceFolders: undefined,
        getConfiguration: vi.fn(),
      },
      window: {},
      ConfigurationTarget: { Workspace: 2 },
    }));
    vi.doMock('../../../../../src/extension/graphView/settings/reader', () => ({
      getGraphViewConfigTarget,
    }));
    vi.doMock('../../../../../src/extension/graphView/settings/snapshot', () => ({
      captureGraphViewSettingsSnapshot,
    }));
    vi.doMock('../../../../../src/extension/actions/resetSettings', () => ({
      ResetSettingsAction,
    }));
    vi.doMock('../../../../../src/extension/undoManager', () => ({
      getUndoManager: () => ({ execute }),
    }));
    vi.doMock('../../../../../src/extension/repoSettings/current', () => ({
      getCodeGraphyConfiguration: vi.fn(),
    }));

    const { DEFAULT_DEPENDENCIES } = await import(
      '../../../../../src/extension/graphView/webview/providerMessages/listener'
    );

    expect(DEFAULT_DEPENDENCIES.getConfigTarget(['folder'] as never)).toBe('workspace-target');
    expect(DEFAULT_DEPENDENCIES.captureSettingsSnapshot('config' as never, 'physics' as never, 'size' as never)).toEqual({ legends: [] });
    expect(
      DEFAULT_DEPENDENCIES.createResetSettingsAction(
        'snapshot' as never,
        'target' as never,
        'context' as never,
        vi.fn(),
        vi.fn(),
        vi.fn(),
      ),
    ).toBe(resetSettingsAction);

    await DEFAULT_DEPENDENCIES.executeUndoAction('undo-action' as never);

    expect(getGraphViewConfigTarget).toHaveBeenCalledWith(['folder']);
    expect(captureGraphViewSettingsSnapshot).toHaveBeenCalledWith('config', 'physics', 'size');
    expect(ResetSettingsAction).toHaveBeenCalledWith(
      'snapshot',
      'target',
      'context',
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
    );
    expect(execute).toHaveBeenCalledWith('undo-action');
  });

  it('creates the provider context and forwards it to the shared webview listener', async () => {
    const createContext = vi.fn(() => ({ id: 'listener-context' }));
    const setListener = vi.fn();
    vi.doMock('vscode', () => ({
      workspace: {
        workspaceFolders: undefined,
        getConfiguration: vi.fn(),
      },
      window: {},
      ConfigurationTarget: { Workspace: 2 },
    }));
    vi.doMock('../../../../../src/extension/repoSettings/current', () => ({
      getCodeGraphyConfiguration: vi.fn(),
    }));
    vi.doMock('../../../../../src/extension/graphView/webview/providerMessages/context', () => ({
      createGraphViewProviderMessageContext: createContext,
    }));
    vi.doMock('../../../../../src/extension/graphView/webview/messages/listener', () => ({
      setGraphViewWebviewMessageListener: setListener,
    }));

    const { DEFAULT_DEPENDENCIES, setGraphViewProviderMessageListener } = await import(
      '../../../../../src/extension/graphView/webview/providerMessages/listener'
    );

    const webview = { onDidReceiveMessage: vi.fn() };
    const source = { id: 'provider-source' };

    setGraphViewProviderMessageListener(webview as never, source as never, DEFAULT_DEPENDENCIES);

    expect(createContext).toHaveBeenCalledWith(source, DEFAULT_DEPENDENCIES);
    expect(setListener).toHaveBeenCalledWith(webview, { id: 'listener-context' });
  });
});
