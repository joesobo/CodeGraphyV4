import { describe, expect, it, vi } from 'vitest';
import {
  sendGraphViewContributionStatuses,
  sendGraphViewContextMenuItems,
  sendGraphViewPluginExporters,
  sendGraphViewPluginToolbarActions,
  sendGraphViewPluginWebviewInjections,
} from '../../../../../src/extension/graphView/webview/plugins/contributionDispatch';

describe('graphView/webview/plugins/contributionDispatch', () => {
  it('sends collected plugin context menu items and exporters', () => {
    const sendMessage = vi.fn();
    const analyzer = {
      registry: {
        list: () => [{ plugin: { id: 'plugin.test', name: 'Test Plugin' } }],
        getPluginAPI: () => ({
          contextMenuItems: [{ label: 'Inspect', when: 'node' as const }],
          exporters: [{ id: 'summary', label: 'Summary Export', group: 'Reports' }],
        }),
      },
    };

    sendGraphViewContextMenuItems(analyzer, sendMessage);
    sendGraphViewPluginExporters(analyzer, sendMessage);

    expect(sendMessage).toHaveBeenNthCalledWith(1, {
      type: 'CONTEXT_MENU_ITEMS',
      payload: {
        items: [
          {
            label: 'Inspect',
            when: 'node',
            icon: undefined,
            group: undefined,
            pluginId: 'plugin.test',
            index: 0,
          },
        ],
      },
    });
    expect(sendMessage).toHaveBeenNthCalledWith(2, {
      type: 'PLUGIN_EXPORTERS_UPDATED',
      payload: {
        items: [
          {
            id: 'summary',
            label: 'Summary Export',
            description: undefined,
            group: 'Reports',
            pluginId: 'plugin.test',
            pluginName: 'Test Plugin',
            index: 0,
          },
        ],
      },
    });
  });

  it('sends toolbar actions and webview injections', () => {
    const sendMessage = vi.fn();
    const resolveAssetPath = vi.fn((assetPath: string, pluginId?: string) => `${pluginId}:${assetPath}`);
    const analyzer = {
      registry: {
        list: () => [
          {
            plugin: {
              id: 'plugin.test',
              name: 'Test Plugin',
              webviewContributions: {
                scripts: ['dist/plugin.js'],
                styles: ['dist/plugin.css'],
              },
            },
          },
        ],
        getPluginAPI: () => ({
          contextMenuItems: [],
          toolbarActions: [
            {
              id: 'open',
              label: 'Open',
              icon: 'target',
              description: 'Open the current file',
              items: [
                { id: 'open-file', label: 'Open File' },
                { id: 'open-folder', label: 'Open Folder', description: 'Open the workspace folder' },
              ],
            },
          ],
        }),
      },
    };

    sendGraphViewPluginToolbarActions(analyzer, sendMessage);
    sendGraphViewPluginWebviewInjections(analyzer, resolveAssetPath, sendMessage);

    expect(sendMessage).toHaveBeenNthCalledWith(1, {
      type: 'PLUGIN_TOOLBAR_ACTIONS_UPDATED',
      payload: {
        items: [
          {
            id: 'open',
            label: 'Open',
            icon: 'target',
            description: 'Open the current file',
            pluginId: 'plugin.test',
            pluginName: 'Test Plugin',
            index: 0,
            items: [
              { id: 'open-file', label: 'Open File', description: undefined, index: 0 },
              { id: 'open-folder', label: 'Open Folder', description: 'Open the workspace folder', index: 1 },
            ],
          },
        ],
      },
    });
    expect(sendMessage).toHaveBeenNthCalledWith(2, {
      type: 'PLUGIN_WEBVIEW_INJECT',
      payload: {
        pluginId: 'plugin.test',
        scripts: ['plugin.test:dist/plugin.js'],
        styles: ['plugin.test:dist/plugin.css'],
      },
    });
  });

  it('sends available Graph View contribution statuses without posting function values', async () => {
    const sendMessage = vi.fn();
    const runtimeNode = vi.fn();
    const project = vi.fn();
    const analyzer = {
      registry: {
        listAvailableGraphViewContributions: vi.fn(async () => ({
          runtimeNodes: [{
            pluginId: 'acme.graph-tools',
            contribution: {
              id: 'acme.graph-tools.runtime-nodes',
              label: 'Runtime Nodes',
              createNodes: runtimeNode,
            },
          }],
          runtimeEdges: [],
          projections: [{
            pluginId: 'acme.graph-tools',
            contribution: {
              id: 'acme.graph-tools.projection',
              label: 'Runtime Projection',
              project,
            },
          }],
          forces: [],
          contextMenu: [],
          ui: [],
        })),
      },
    };

    await sendGraphViewContributionStatuses(
      analyzer,
      { workspaceRoot: '/workspace' },
      sendMessage,
    );

    expect(analyzer.registry.listAvailableGraphViewContributions).toHaveBeenCalledWith({
      workspaceRoot: '/workspace',
    });
    expect(sendMessage).toHaveBeenCalledWith({
      type: 'GRAPH_VIEW_CONTRIBUTIONS_UPDATED',
      payload: {
        contributions: [
          {
            kind: 'runtimeNodes',
            pluginId: 'acme.graph-tools',
            contributionId: 'acme.graph-tools.runtime-nodes',
            label: 'Runtime Nodes',
          },
          {
            kind: 'projections',
            pluginId: 'acme.graph-tools',
            contributionId: 'acme.graph-tools.projection',
            label: 'Runtime Projection',
          },
        ],
      },
    });
    expect(sendMessage.mock.calls[0]?.[0]).not.toHaveProperty(
      'payload.contributions.0.contribution.createNodes',
    );
  });

  it('skips plugin dispatches when no analyzer is available', () => {
    const sendMessage = vi.fn();
    const resolveAssetPath = vi.fn();

    sendGraphViewContextMenuItems(undefined, sendMessage);
    sendGraphViewPluginExporters(undefined, sendMessage);
    sendGraphViewPluginToolbarActions(undefined, sendMessage);
    sendGraphViewPluginWebviewInjections(undefined, resolveAssetPath, sendMessage);

    expect(resolveAssetPath).not.toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();
  });
});
