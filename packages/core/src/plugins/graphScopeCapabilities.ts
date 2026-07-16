import type { GraphEdgeKind, IPluginGraphScopeCapabilities } from '@codegraphy-dev/plugin-api';
import type { CorePluginInfo } from './registry';
import { getPluginsForFile } from './routing/router/lookups';

export function listGraphScopeCapabilities(input: {
  disabledPlugins: ReadonlySet<string>;
  extensionMap: Map<string, string[]>;
  filePaths: readonly string[];
  plugins: Map<string, CorePluginInfo>;
}): Required<IPluginGraphScopeCapabilities> {
  const filePathsByPluginId = collectApplicableFilePaths(input);
  return collectDeclaredCapabilities(input.plugins, filePathsByPluginId);
}

function collectApplicableFilePaths(input: {
  disabledPlugins: ReadonlySet<string>;
  extensionMap: Map<string, string[]>;
  filePaths: readonly string[];
  plugins: Map<string, CorePluginInfo>;
}): Map<string, string[]> {
  const filePathsByPluginId = new Map<string, string[]>();
  for (const filePath of input.filePaths) {
    for (const plugin of getPluginsForFile(filePath, input.plugins, input.extensionMap)) {
      if (input.disabledPlugins.has(plugin.id)) continue;
      filePathsByPluginId.set(plugin.id, [...(filePathsByPluginId.get(plugin.id) ?? []), filePath]);
    }
  }

  return filePathsByPluginId;
}

function collectDeclaredCapabilities(
  plugins: ReadonlyMap<string, CorePluginInfo>,
  filePathsByPluginId: ReadonlyMap<string, readonly string[]>,
): Required<IPluginGraphScopeCapabilities> {
  const nodeTypes = new Set<string>();
  const edgeTypes = new Set<GraphEdgeKind>();
  for (const [pluginId, filePaths] of filePathsByPluginId) {
    const capabilities = plugins.get(pluginId)?.plugin
      .contributeGraphScopeCapabilities?.({ filePaths });
    for (const nodeType of capabilities?.nodeTypes ?? []) nodeTypes.add(nodeType);
    for (const edgeType of capabilities?.edgeTypes ?? []) edgeTypes.add(edgeType);
  }
  return { nodeTypes: [...nodeTypes], edgeTypes: [...edgeTypes] };
}
