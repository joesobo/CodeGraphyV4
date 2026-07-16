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
        sendGraphViewContributionStatuses: vi.fn((_analyzer, _context, callback) =>
          callback({ type: 'GRAPH_VIEW_CONTRIBUTIONS_UPDATED', payload: { contributions: [] } }),
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
    methods._sendGraphViewContributionStatuses();
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
    expect(sendMessage).toHaveBeenCalledWith({
      type: 'GRAPH_VIEW_CONTRIBUTIONS_UPDATED',
      payload: { contributions: [] },
    });
  });

  it('sends Graph View contribution statuses with the active workspace root', () => {
    const workspaceFolder = { uri: vscode.Uri.file('/workspace') } as vscode.WorkspaceFolder;
    const sendGraphViewContributionStatuses = vi.fn(async (_analyzer, context, callback, disabledPlugins) => {
      expect(context).toEqual({ workspaceRoot: '/workspace' });
      expect(disabledPlugins).toBe(source._disabledPlugins);
      callback({
        type: 'GRAPH_VIEW_CONTRIBUTIONS_UPDATED',
        payload: {
          contributions: [{
            kind: 'runtimeNodes',
            pluginId: 'acme.graph-tools',
            contributionId: 'acme.graph-tools.runtime-nodes',
            label: 'Runtime Nodes',
          }],
        },
      });
    });
    const source = createPluginSource();
    const methods = createGraphViewProviderPluginBroadcastMethods(
      source,
      {
        sendGraphViewContributionStatuses,
        getWorkspaceFolders: vi.fn(() => [workspaceFolder]),
      },
      1,
    );

    methods._sendGraphViewContributionStatuses();

    expect(sendGraphViewContributionStatuses).toHaveBeenCalledWith(
      source._analyzer,
      { workspaceRoot: '/workspace' },
      expect.any(Function),
      source._disabledPlugins,
    );
    expect(source._sendMessage).toHaveBeenCalledWith({
      type: 'GRAPH_VIEW_CONTRIBUTIONS_UPDATED',
      payload: {
        contributions: [{
          kind: 'runtimeNodes',
          pluginId: 'acme.graph-tools',
          contributionId: 'acme.graph-tools.runtime-nodes',
          label: 'Runtime Nodes',
        }],
      },
    });
  });

  it('uses provider-owned resource helpers and workspace folders for group updates', () => {
    const workspaceFolder = { uri: vscode.Uri.file('/workspace') } as vscode.WorkspaceFolder;
    const resolveWebviewAssetPath = vi.fn(() => 'asset://icon.svg');
    const registerBuiltInPluginRoots = vi.fn();
    const refreshWebviewResourceRoots = vi.fn();
    const source = createPluginSource({
      _resolveWebviewAssetPath: resolveWebviewAssetPath,
      _registerBuiltInPluginRoots: registerBuiltInPluginRoots,
      _refreshWebviewResourceRoots: refreshWebviewResourceRoots,
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
    expect(registerBuiltInPluginRoots).toHaveBeenCalledTimes(2);
    expect(refreshWebviewResourceRoots).toHaveBeenCalledTimes(1);
    expect(refreshWebviewResourceRoots.mock.invocationCallOrder[0]).toBeLessThan(
      resolveWebviewAssetPath.mock.invocationCallOrder[0]!,
    );
  });

  it('sends graph controls from the raw workspace graph before view narrowing', () => {
    const rawGraphData = {
      nodes: [{ id: 'src/app.ts', label: 'App', color: '#111111', nodeType: 'file' }],
      edges: [],
    };
    const visibleGraphData = {
      nodes: [{ id: 'src/focused.ts', label: 'Focused', color: '#222222', nodeType: 'file' }],
      edges: [],
    };
    const source = createPluginSource({
      _rawGraphData: rawGraphData,
      _graphData: visibleGraphData,
    });
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
      source._rawGraphData,
      source._analyzer,
      expect.any(Function),
      expect.any(Object),
      source._disabledPlugins,
    );
    expect(sendPluginExporters).toHaveBeenCalledWith(
      source._analyzer,
      expect.any(Function),
      source._disabledPlugins,
    );
    expect(source._sendMessage).toHaveBeenCalledWith({
      type: 'GRAPH_CONTROLS_UPDATED',
      payload: {
        nodeTypes: [],
        edgeTypes: [],
        nodeColors: {},
        nodeVisibility: {},
        edgeVisibility: {},
      },
    });
    expect(source._sendMessage).toHaveBeenCalledWith({
      type: 'PLUGIN_EXPORTERS_UPDATED',
      payload: { exporters: ['markdown'] },
    });
  });

  it('sends groups without a sidebar target when the graph view is unavailable', () => {
    const source = createPluginSource({ _view: undefined });
    const sendGroupsUpdated = vi.fn();
    const methods = createGraphViewProviderPluginBroadcastMethods(
      source,
      { sendGroupsUpdated },
      1,
    );

    methods._sendGroupsUpdated();

    expect(sendGroupsUpdated).toHaveBeenCalledWith(
      source._groups,
      expect.objectContaining({ view: undefined }),
      expect.any(Function),
    );
  });
});
