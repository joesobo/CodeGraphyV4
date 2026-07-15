import type { IAccessProvider, IPlugin } from '@codegraphy-dev/plugin-api';
import {
  createEmptyGraphViewContributionSet,
  resolvePluginAccess,
  type CoreGraphViewContributionEntry,
  type CoreGraphViewContributionSet,
  type CorePluginAccessContext,
} from './access/checks';
import type { CorePluginInfo } from './registry';

function listAccessProviders(plugins: ReadonlyMap<string, CorePluginInfo>): IAccessProvider[] {
  return [...plugins.values()]
    .map(info => info.plugin.accessProvider)
    .filter((provider): provider is IAccessProvider => provider !== undefined);
}

async function appendAvailable<TContribution extends { requiresAccess?: unknown }>(input: {
  context: CorePluginAccessContext;
  contributions: readonly TContribution[] | undefined;
  providers: readonly IAccessProvider[];
  plugin: IPlugin;
  target: CoreGraphViewContributionEntry<TContribution>[];
}): Promise<void> {
  for (const contribution of input.contributions ?? []) {
    const access = await resolvePluginAccess(
      input.plugin,
      input.providers,
      input.context,
      contribution.requiresAccess as never,
    );
    if (access.available) input.target.push({ pluginId: input.plugin.id, contribution });
  }
}

async function appendPluginContributions(input: {
  context: CorePluginAccessContext;
  contributions: CoreGraphViewContributionSet;
  plugin: IPlugin;
  providers: readonly IAccessProvider[];
}): Promise<void> {
  const { context, contributions, plugin, providers } = input;
  await appendAvailable({ context, contributions: plugin.graphView?.runtimeNodes, providers, plugin, target: contributions.runtimeNodes });
  await appendAvailable({ context, contributions: plugin.graphView?.runtimeEdges, providers, plugin, target: contributions.runtimeEdges });
  await appendAvailable({ context, contributions: plugin.graphView?.projections, providers, plugin, target: contributions.projections });
  await appendAvailable({ context, contributions: plugin.graphView?.forces, providers, plugin, target: contributions.forces });
  await appendAvailable({ context, contributions: plugin.graphView?.nodeDragEnd, providers, plugin, target: contributions.nodeDragEnd });
  await appendAvailable({ context, contributions: plugin.graphView?.contextMenu, providers, plugin, target: contributions.contextMenu });
  await appendAvailable({ context, contributions: plugin.graphView?.ui, providers, plugin, target: contributions.ui });
}

export async function listAvailableGraphViewContributions(
  plugins: ReadonlyMap<string, CorePluginInfo>,
  context: CorePluginAccessContext,
): Promise<CoreGraphViewContributionSet> {
  const contributions = createEmptyGraphViewContributionSet();
  const providers = listAccessProviders(plugins);
  for (const info of plugins.values()) {
    if (context.disabledPlugins?.has(info.plugin.id)) continue;
    const access = await resolvePluginAccess(info.plugin, providers, context);
    if (access.available) {
      await appendPluginContributions({ context, contributions, plugin: info.plugin, providers });
    }
  }
  return contributions;
}

export { listAccessProviders };
