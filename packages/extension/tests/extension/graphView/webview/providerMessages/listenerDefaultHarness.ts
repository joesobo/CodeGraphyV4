import { vi } from 'vitest';
import * as vscode from 'vscode';
import type { IGraphData } from '@/shared/graph/contracts';
import type { GraphViewMessageListenerContext } from '../../../../../src/extension/graphView/webview/messages/listener';
import type { GraphViewProviderMessageListenerSource } from '../../../../../src/extension/graphView/webview/providerMessages/listener';
import { createSettingsSnapshot, createSource } from './listener.fixture';

export async function loadDefaultListenerHarness(
  sourceOverrides: Partial<GraphViewProviderMessageListenerSource> = {},
) {
  vi.resetModules();

  let capturedContext: GraphViewMessageListenerContext | undefined;
  const workspaceFolders = [{ uri: { fsPath: '/workspace' }, name: 'workspace', index: 0 }];
  const configurationGet = vi.fn(<T>(key: string, defaultValue: T) => {
    return defaultValue;
  });
  const configurationUpdate = vi.fn(() => Promise.resolve());
  const getConfigTarget = vi.fn(() => vscode.ConfigurationTarget.Workspace);
  const captureSettingsSnapshot = vi.fn(() => createSettingsSnapshot());
  const execute = vi.fn(() => Promise.resolve());
  const ResetSettingsAction = vi.fn(function (
    this: Record<string, unknown>,
    snapshot: unknown,
    target: unknown,
    context: unknown,
    sendAllSettings: () => void,
    setNodeSizeMode: (mode: GraphViewProviderMessageListenerSource['_nodeSizeMode']) => void,
    analyzeAndSendData: () => Promise<void>,
  ) {
    this.description = 'reset settings';
    this.execute = vi.fn(async () => undefined);
    this.undo = vi.fn(async () => undefined);
    this.snapshot = snapshot;
    this.target = target;
    this.context = context;
    this.sendAllSettings = sendAllSettings;
    this.setNodeSizeMode = setNodeSizeMode;
    this.analyzeAndSendData = analyzeAndSendData;
  });
  vi.doMock('vscode', () => ({
    workspace: {
      workspaceFolders,
      getConfiguration: vi.fn(() => ({
        get: configurationGet,
        update: configurationUpdate,
      })),
    },
    window: {
      showInformationMessage: vi.fn(),
      showOpenDialog: vi.fn(() => Promise.resolve(undefined)),
    },
  }));
  vi.doMock('../../../../../src/extension/graphView/webview/messages/listener', () => ({
    setGraphViewWebviewMessageListener: vi.fn((_webview, context) => {
      capturedContext = context;
    }),
  }));
  vi.doMock('../../../../../src/extension/graphView/settings/reader', () => ({
    getGraphViewConfigTarget: getConfigTarget,
  }));
  vi.doMock('../../../../../src/extension/graphView/settings/snapshot', () => ({
    captureGraphViewSettingsSnapshot: captureSettingsSnapshot,
  }));
  vi.doMock('../../../../../src/extension/actions/resetSettings', () => ({
    ResetSettingsAction,
  }));
  vi.doMock('../../../../../src/extension/undoManager', () => ({
    getUndoManager: () => ({ execute }),
  }));

  const { setGraphViewProviderMessageListener: setListener } = await import(
    '../../../../../src/extension/graphView/webview/providerMessages/listener'
  );
  const source = createSource({
    _graphData: {
      nodes: [{ id: 'node-1', label: 'node-1', color: '#93C5FD' }],
      edges: [{ id: 'edge-1', from: 'node-1', to: 'node-2' , kind: 'import', sources: [] }],
    } satisfies IGraphData,
    ...sourceOverrides,
  });
  const webview = {
    onDidReceiveMessage: vi.fn(),
  };

  setListener(webview as never, source);

  return {
    context: capturedContext as GraphViewMessageListenerContext,
    source,
    workspaceFolders,
    configurationGet,
    configurationUpdate,
    getConfigTarget,
    captureSettingsSnapshot,
    ResetSettingsAction,
    execute,
  };
}
