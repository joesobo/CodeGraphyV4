import * as vscode from 'vscode';
import { describe, expect, it, vi } from 'vitest';
import type { IGroup } from '../../../../../src/shared/settings/groups';
import { createGraphViewProviderPluginBroadcastMethods } from '../../../../../src/extension/graphView/provider/plugin/broadcasts';
import { createPluginSource } from './source';
import * as controlsSendModule from '../../../../../src/extension/graphView/controls/send';

describe('graphView/provider/plugin/broadcasts', () => {
  it('forwards broadcasts through the provider message bridge', () => {
    const sendMessage = vi.fn();
    const source = createPluginSource({
      _sendMessage: sendMessage,
      _groups: [{ id: 'user', pattern: '*.ts', color: '#fff' } as IGroup],
    });
    const methods = createGraphViewProviderPluginBroadcastMethods(
      source,
      {
        sendDepthState: vi.fn((
          _context,
          _depthMode,
          _rawGraphData,
          _defaultDepthLimit,
          callback,
        ) => callback({ type: 'DEPTH_MODE_UPDATED', payload: { depthMode: false } })),
        sendPluginStatuses: vi.fn((_analyzer, _disabledPlugins, callback) =>
          callback({ type: 'PLUGINS_UPDATED', payload: { plugins: [] } }),
        ),
        sendDecorations: vi.fn((_manager, callback) =>
          callback({ type: 'DECORATIONS_UPDATED', payload: { nodes: [], edges: [] } }),
        ),
        sendContextMenuItems: vi.fn((_analyzer, callback) =>
          callback({ type: 'CONTEXT_MENU_ITEMS', payload: { items: [] } }),
        ),
        sendPluginExporters: vi.fn((_analyzer, callback) =>
          callback({ type: 'PLUGIN_EXPORTERS_UPDATED', payload: { exporters: [] } }),
        ),
        sendPluginToolbarActions: vi.fn((_analyzer, callback) =>
          callback({ type: 'PLUGIN_TOOLBAR_ACTIONS_UPDATED', payload: { actions: [] } }),
        ),
        sendPluginWebviewInjections: vi.fn((_analyzer, _resolveAssetPath, callback) =>
          callback({ type: 'PLUGIN_WEBVIEW_INJECT', payload: { kind: 'script', src: 'asset://script.js' } }),
        ),
        sendGroupsUpdated: vi.fn((_groups, _options, callback) =>
          callback({ type: 'LEGENDS_UPDATED', payload: { legends: [] } }),
        ),
        getWorkspaceFolders: vi.fn(() => []),
      },
      1,
    );

    methods._sendDepthState();
    methods._sendPluginStatuses();
    methods._sendDecorations();
    methods._sendContextMenuItems();
    methods._sendPluginExporters();
    methods._sendPluginToolbarActions();
    methods._sendPluginWebviewInjections();
    methods._sendGroupsUpdated();

    expect(sendMessage).toHaveBeenCalledWith({
      type: 'DEPTH_MODE_UPDATED',
      payload: { depthMode: false },
    });
    expect(sendMessage).toHaveBeenCalledWith({
      type: 'LEGENDS_UPDATED',
      payload: { legends: [] },
    });
  });

  it('uses provider-owned resource helpers and workspace folders for group updates', () => {
    const workspaceFolder = { uri: vscode.Uri.file('/workspace') } as vscode.WorkspaceFolder;
    const resolveWebviewAssetPath = vi.fn(() => 'asset://icon.svg');
    const registerBuiltInPluginRoots = vi.fn();
    const source = createPluginSource({
      _resolveWebviewAssetPath: resolveWebviewAssetPath,
      _registerBuiltInPluginRoots: registerBuiltInPluginRoots,
    });
    const methods = createGraphViewProviderPluginBroadcastMethods(
      source,
      {
        sendDepthState: vi.fn(),
        sendPluginStatuses: vi.fn(),
        sendDecorations: vi.fn(),
        sendContextMenuItems: vi.fn(),
        sendPluginExporters: vi.fn(),
        sendPluginToolbarActions: vi.fn(),
        sendPluginWebviewInjections: vi.fn((analyzer, resolveAssetPath, callback) => {
          expect(analyzer).toBe(source._analyzer);
          expect(resolveAssetPath('icon.svg', 'plugin.test')).toBe('asset://icon.svg');
          callback({ type: 'PLUGIN_WEBVIEW_INJECT', payload: { kind: 'script', src: 'asset://script.js' } });
        }),
        sendGroupsUpdated: vi.fn((_groups, options, callback) => {
          expect(options.workspaceFolder).toBe(workspaceFolder);
          options.registerPluginRoots();
          expect(options.resolvePluginAssetPath('icon.svg', 'plugin.test')).toBe('asset://icon.svg');
          callback({ type: 'LEGENDS_UPDATED', payload: { legends: [] } });
        }),
        getWorkspaceFolders: vi.fn(() => [workspaceFolder]),
      },
      1,
    );

    methods._sendPluginWebviewInjections();
    methods._sendGroupsUpdated();

    expect(resolveWebviewAssetPath).toHaveBeenCalledWith('icon.svg', 'plugin.test');
    expect(registerBuiltInPluginRoots).toHaveBeenCalledOnce();
  });

  it('sends graph controls and plugin exporters through the provider bridge', () => {
    const source = createPluginSource();
    const sendGraphControlsUpdatedSpy = vi
      .spyOn(controlsSendModule, 'sendGraphControlsUpdated')
      .mockImplementation((_graphData, _analyzer, sendMessage) => {
        sendMessage({
          type: 'GRAPH_CONTROLS_UPDATED',
          payload: {
            nodeTypes: [],
            edgeTypes: [],
            nodeColors: {},
            nodeVisibility: {},
            edgeVisibility: {},
            edgeColors: {},
          },
        });
      });
    const sendPluginExporters = vi.fn((_analyzer, sendMessage) => {
      sendMessage({ type: 'PLUGIN_EXPORTERS_UPDATED', payload: { exporters: ['markdown'] } });
    });
    const methods = createGraphViewProviderPluginBroadcastMethods(
      source,
      {
        sendPluginExporters,
      },
      1,
    );

    methods._sendGraphControls();
    methods._sendPluginExporters();

    expect(sendGraphControlsUpdatedSpy).toHaveBeenCalledWith(
      source._graphData,
      source._analyzer,
      expect.any(Function),
      expect.any(Object),
    );
    expect(sendPluginExporters).toHaveBeenCalledWith(source._analyzer, expect.any(Function));
    expect(source._sendMessage).toHaveBeenCalledWith({
      type: 'GRAPH_CONTROLS_UPDATED',
      payload: {
        nodeTypes: [],
        edgeTypes: [],
        nodeColors: {},
        nodeVisibility: {},
        edgeVisibility: {},
        edgeColors: {},
      },
    });
    expect(source._sendMessage).toHaveBeenCalledWith({
      type: 'PLUGIN_EXPORTERS_UPDATED',
      payload: { exporters: ['markdown'] },
    });
  });

  it('falls back to the timeline view when the main view is unavailable', () => {
    const timelineView = {
      webview: { cspSource: 'timeline' },
      viewType: 'codegraphy.timelineView',
      onDidDispose: vi.fn(),
      visible: true,
      onDidChangeVisibility: vi.fn(),
      show: vi.fn(),
    } as unknown as vscode.WebviewView;
    const source = createPluginSource({
      _view: undefined,
      _timelineView: timelineView,
    });
    const sendGroupsUpdated = vi.fn();
    const methods = createGraphViewProviderPluginBroadcastMethods(
      source,
      {
        sendGroupsUpdated,
      },
      1,
    );

    methods._sendGroupsUpdated();

    expect(sendGroupsUpdated).toHaveBeenCalledWith(
      source._groups,
      expect.objectContaining({ view: timelineView }),
      expect.any(Function),
    );
  });
});
