import {
  type CorePluginAccessContext,
} from '@codegraphy-dev/core';
import type { ExtensionGraphViewContributionSet } from '@codegraphy-dev/extension-plugin-api';
import type {
  IAccessProvider,
  IPluginInfo,
} from '../../../types/contracts';

export function listPluginAccessProviders(pluginInfos: Iterable<IPluginInfo>): IAccessProvider[] {
  return Array.from(pluginInfos)
    .map(info => info.plugin.accessProvider)
    .filter((provider): provider is IAccessProvider => provider !== undefined);
}

export async function listAvailableGraphViewContributionsForPlugins(
  _pluginInfos: Iterable<IPluginInfo>,
  _context: CorePluginAccessContext = {},
): Promise<ExtensionGraphViewContributionSet> {
  return {
    runtimeNodes: [],
    runtimeEdges: [],
    projections: [],
    forces: [],
    nodeDragEnd: [],
    contextMenu: [],
    ui: [],
  };
}
