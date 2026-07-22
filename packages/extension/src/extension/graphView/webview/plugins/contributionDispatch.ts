import type { ExtensionToWebviewMessage } from '../../../../shared/protocol/extensionToWebview';
import type {
  GraphViewContributionStatusKind,
  IGraphViewContributionStatus,
} from '../../../../shared/protocol/extensionToWebview';
import {
  collectGraphViewContextMenuItems,
  collectGraphViewExporters,
  collectGraphViewToolbarActions,
  collectGraphViewWebviewInjections,
} from './contributions';

interface GraphViewPluginRegistry {
  list(): Array<{
    plugin: {
      id: string;
      name?: string;
    };
  }>;
  getPluginAPI(pluginId: string):
    | {
        readonly contextMenuItems: ReadonlyArray<{
          label: string;
          when: 'node' | 'edge' | 'both';
          icon?: string;
          group?: string;
        }>;
        readonly exporters?: ReadonlyArray<{
          id: string;
          label: string;
          description?: string;
          group?: string;
        }>;
        readonly toolbarActions?: ReadonlyArray<{
          id: string;
          label: string;
          icon?: string;
          description?: string;
          items: ReadonlyArray<{
            id: string;
            label: string;
            description?: string;
          }>;
        }>;
      }
    | undefined;
}

interface GraphViewExtensionPluginRegistry {
  extensionPlugins: {
    listActive(): Array<{
      descriptorSignature?: string;
      plugin: {
        id: string;
        name?: string;
        webviewContributions?: {
          scripts?: string[];
          styles?: string[];
          assets?: Array<{
            id: string;
            label: string;
            path: string;
            kind?: string;
            metadata?: Record<string, unknown>;
          }>;
        };
      };
    }>;
  };
}

interface GraphViewPluginAnalyzer {
  registry: GraphViewPluginRegistry;
}

interface GraphViewContributionSet {
  runtimeNodes: Array<{ pluginId: string; contribution: { id: string; label: string } }>;
  runtimeEdges: Array<{ pluginId: string; contribution: { id: string; label: string } }>;
  projections: Array<{ pluginId: string; contribution: { id: string; label: string } }>;
  forces: Array<{ pluginId: string; contribution: { id: string; label: string } }>;
  nodeDragEnd: Array<{ pluginId: string; contribution: { id: string; label: string } }>;
  contextMenu: Array<{ pluginId: string; contribution: { id: string; label: string } }>;
  ui: Array<{ pluginId: string; contribution: { id: string; label: string } }>;
}

interface GraphViewContributionAnalyzer {
  registry: {
    listAvailableGraphViewContributions?(
      context?: { workspaceRoot?: string; disabledPlugins?: ReadonlySet<string> },
    ): Promise<GraphViewContributionSet>;
  };
}

function listActivePluginInfos(
  registry: GraphViewPluginRegistry,
  disabledPlugins: ReadonlySet<string>,
): ReturnType<GraphViewPluginRegistry['list']> {
  return registry.list().filter(info => !disabledPlugins.has(info.plugin.id));
}

function listActiveExtensionPluginInfos(
  registry: GraphViewExtensionPluginRegistry,
  disabledPlugins: ReadonlySet<string>,
): ReturnType<GraphViewExtensionPluginRegistry['extensionPlugins']['listActive']> {
  return registry.extensionPlugins.listActive().filter(info => !disabledPlugins.has(info.plugin.id));
}

function collectContributionStatuses(
  contributionSet: GraphViewContributionSet,
): IGraphViewContributionStatus[] {
  const statuses: IGraphViewContributionStatus[] = [];

  for (const kind of [
    'runtimeNodes',
    'runtimeEdges',
    'projections',
    'forces',
    'nodeDragEnd',
    'contextMenu',
    'ui',
  ] as const satisfies readonly GraphViewContributionStatusKind[]) {
    for (const entry of contributionSet[kind]) {
      statuses.push({
        kind,
        pluginId: entry.pluginId,
        contributionId: entry.contribution.id,
        label: entry.contribution.label,
      });
    }
  }

  return statuses;
}

export async function sendGraphViewContributionStatuses(
  analyzer: GraphViewContributionAnalyzer | undefined,
  context: { workspaceRoot?: string },
  sendMessage: (
    message: Extract<ExtensionToWebviewMessage, { type: 'GRAPH_VIEW_CONTRIBUTIONS_UPDATED' }>
  ) => void,
  disabledPlugins: ReadonlySet<string> = new Set(),
): Promise<void> {
  if (!analyzer?.registry.listAvailableGraphViewContributions) {
    return;
  }

  const contributions = await analyzer.registry.listAvailableGraphViewContributions({
    ...context,
    disabledPlugins,
  });
  sendMessage({
    type: 'GRAPH_VIEW_CONTRIBUTIONS_UPDATED',
    payload: {
      contributions: collectContributionStatuses(contributions),
    },
  });
}

export function sendGraphViewContextMenuItems(
  analyzer: Pick<GraphViewPluginAnalyzer, 'registry'> | undefined,
  sendMessage: (
    message: Extract<ExtensionToWebviewMessage, { type: 'CONTEXT_MENU_ITEMS' }>
  ) => void,
  disabledPlugins: ReadonlySet<string> = new Set(),
): void {
  if (!analyzer) return;

  const items = collectGraphViewContextMenuItems(
    listActivePluginInfos(analyzer.registry, disabledPlugins),
    (pluginId) => analyzer.registry.getPluginAPI(pluginId),
  );
  sendMessage({ type: 'CONTEXT_MENU_ITEMS', payload: { items } });
}

export function sendGraphViewPluginExporters(
  analyzer: Pick<GraphViewPluginAnalyzer, 'registry'> | undefined,
  sendMessage: (
    message: Extract<ExtensionToWebviewMessage, { type: 'PLUGIN_EXPORTERS_UPDATED' }>
  ) => void,
  disabledPlugins: ReadonlySet<string> = new Set(),
): void {
  if (!analyzer) return;

  const items = collectGraphViewExporters(
    listActivePluginInfos(analyzer.registry, disabledPlugins),
    (pluginId) => {
      const api = analyzer.registry.getPluginAPI(pluginId);
      if (!api) return undefined;
      return {
        exporters: api.exporters ?? [],
      };
    },
  );
  sendMessage({ type: 'PLUGIN_EXPORTERS_UPDATED', payload: { items } });
}

export function sendGraphViewPluginToolbarActions(
  analyzer: Pick<GraphViewPluginAnalyzer, 'registry'> | undefined,
  sendMessage: (
    message: Extract<ExtensionToWebviewMessage, { type: 'PLUGIN_TOOLBAR_ACTIONS_UPDATED' }>
  ) => void,
  disabledPlugins: ReadonlySet<string> = new Set(),
): void {
  if (!analyzer) return;

  const items = collectGraphViewToolbarActions(
    listActivePluginInfos(analyzer.registry, disabledPlugins),
    (pluginId) => {
      const api = analyzer.registry.getPluginAPI(pluginId);
      if (!api) return undefined;
      return {
        toolbarActions: api.toolbarActions ?? [],
      };
    },
  );
  sendMessage({ type: 'PLUGIN_TOOLBAR_ACTIONS_UPDATED', payload: { items } });
}

export function sendGraphViewPluginWebviewInjections(
  analyzer: { registry: GraphViewExtensionPluginRegistry } | undefined,
  resolveAssetPath: (assetPath: string, pluginId?: string) => string,
  sendMessage: (
    message: Extract<ExtensionToWebviewMessage, { type: 'PLUGIN_WEBVIEW_INJECT' }>
  ) => void,
  disabledPlugins: ReadonlySet<string> = new Set(),
): void {
  if (!analyzer) return;

  const injections = collectGraphViewWebviewInjections(
    listActiveExtensionPluginInfos(analyzer.registry, disabledPlugins),
    resolveAssetPath,
  );
  for (const injection of injections) {
    sendMessage({
      type: 'PLUGIN_WEBVIEW_INJECT',
      payload: injection,
    });
  }
}
