import type {
  GraphEdgeKind,
  IPluginGraphScopeCapabilities,
} from '../../../types/contracts';
import { getPluginsForFile } from '../../../routing/router/lookups';
import type {
  CoreGraphScopeCapabilitiesProvider,
  IPluginInfoV2,
} from './store';

function collectApplicableFilePaths(
  filePaths: readonly string[],
  plugins: Map<string, IPluginInfoV2>,
  extensionMap: Map<string, string[]>,
  disabledPlugins: ReadonlySet<string>,
): Map<string, string[]> {
  const applicable = new Map<string, string[]>();
  for (const filePath of filePaths) {
    for (const plugin of getPluginsForFile(filePath, plugins, extensionMap)) {
      if (disabledPlugins.has(plugin.id)) continue;
      const pluginFilePaths = applicable.get(plugin.id) ?? [];
      pluginFilePaths.push(filePath);
      applicable.set(plugin.id, pluginFilePaths);
    }
  }
  return applicable;
}

function addPluginCapabilities(
  plugin: IPluginInfoV2['plugin'] | undefined,
  filePaths: string[],
  nodeTypes: Set<string>,
  edgeTypes: Set<GraphEdgeKind>,
): void {
  const capabilities = plugin?.contributeGraphScopeCapabilities?.({ filePaths });
  for (const nodeType of capabilities?.nodeTypes ?? []) nodeTypes.add(nodeType);
  for (const edgeType of capabilities?.edgeTypes ?? []) edgeTypes.add(edgeType);
}

export function collectGraphScopeCapabilities(
  filePaths: readonly string[],
  disabledPlugins: ReadonlySet<string>,
  plugins: Map<string, IPluginInfoV2>,
  extensionMap: Map<string, string[]>,
  coreProvider: CoreGraphScopeCapabilitiesProvider | undefined,
): Required<IPluginGraphScopeCapabilities> {
  const core = coreProvider?.(filePaths);
  const nodeTypes = new Set<string>(core?.nodeTypes ?? []);
  const edgeTypes = new Set<GraphEdgeKind>(core?.edgeTypes ?? []);
  const applicable = collectApplicableFilePaths(
    filePaths,
    plugins,
    extensionMap,
    disabledPlugins,
  );
  for (const [pluginId, pluginFilePaths] of applicable) {
    addPluginCapabilities(plugins.get(pluginId)?.plugin, pluginFilePaths, nodeTypes, edgeTypes);
  }
  return { edgeTypes: [...edgeTypes], nodeTypes: [...nodeTypes] };
}
