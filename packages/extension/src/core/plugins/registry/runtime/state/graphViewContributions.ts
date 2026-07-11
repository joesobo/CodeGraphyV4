import {
  createEmptyGraphViewContributionSet,
  resolvePluginAccess,
  type CoreGraphViewContributionEntry,
  type CoreGraphViewContributionSet,
  type CorePluginAccessContext,
} from '@codegraphy-dev/core';
import type {
  IAccessProvider,
  IGraphViewContextMenuContribution,
  IGraphViewForceAdapterContribution,
  IGraphViewNodeDragEndContribution,
  IGraphViewProjectionContribution,
  IGraphViewRuntimeEdgeContribution,
  IGraphViewRuntimeNodeContribution,
  IGraphViewUiSlotContribution,
  IPlugin,
  IPluginInfo,
} from '../../../types/contracts';

export function listPluginAccessProviders(pluginInfos: Iterable<IPluginInfo>): IAccessProvider[] {
  return Array.from(pluginInfos)
    .map(info => info.plugin.accessProvider)
    .filter((provider): provider is IAccessProvider => provider !== undefined);
}

async function pushAvailableGraphViewContributions<TContribution extends { requiresAccess?: unknown }>(
  plugin: IPlugin,
  accessProviders: readonly IAccessProvider[],
  contributions: readonly TContribution[] | undefined,
  target: CoreGraphViewContributionEntry<TContribution>[],
  context: CorePluginAccessContext,
): Promise<void> {
  if (!contributions) {
    return;
  }

  for (const contribution of contributions) {
    const contributionAccess = await resolvePluginAccess(
      plugin,
      accessProviders,
      context,
      contribution.requiresAccess as never,
    );
    if (contributionAccess.available) {
      target.push({
        pluginId: plugin.id,
        contribution,
      });
    }
  }
}

async function appendAvailableGraphViewContributions(
  plugin: IPlugin,
  accessProviders: readonly IAccessProvider[],
  contributions: CoreGraphViewContributionSet,
  context: CorePluginAccessContext,
  onPluginError?: (pluginId: string, error: unknown) => void,
): Promise<void> {
  const graphView = plugin.graphView;
  if (!graphView) {
    return;
  }

  await pushAvailableGraphViewContributions<IGraphViewRuntimeNodeContribution>(
    plugin,
    accessProviders,
    graphView.runtimeNodes,
    contributions.runtimeNodes,
    context,
  );
  await pushAvailableGraphViewContributions<IGraphViewRuntimeEdgeContribution>(
    plugin,
    accessProviders,
    graphView.runtimeEdges,
    contributions.runtimeEdges,
    context,
  );
  await pushAvailableGraphViewContributions<IGraphViewProjectionContribution>(
    plugin,
    accessProviders,
    graphView.projections,
    contributions.projections,
    context,
  );
  await pushAvailableGraphViewContributions<IGraphViewForceAdapterContribution>(
    plugin,
    accessProviders,
    graphView.forces,
    contributions.forces,
    context,
  );
  await pushAvailableGraphViewContributions<IGraphViewNodeDragEndContribution>(
    plugin,
    accessProviders,
    graphView.nodeDragEnd,
    contributions.nodeDragEnd,
    context,
  );
  await pushAvailableGraphViewContributions<IGraphViewContextMenuContribution>(
    plugin,
    accessProviders,
    onPluginError ? graphView.contextMenu?.map(contribution => ({
      ...contribution,
      getLabel: contribution.getLabel
        ? (runContext) => {
            try {
              return contribution.getLabel!(runContext);
            } catch (error) {
              onPluginError?.(plugin.id, error);
              return contribution.label;
            }
          }
        : undefined,
      isVisible: contribution.isVisible
        ? (runContext) => {
            try {
              return contribution.isVisible!(runContext);
            } catch (error) {
              onPluginError?.(plugin.id, error);
              return false;
            }
          }
        : undefined,
      async run(runContext) {
        try {
          await contribution.run(runContext);
        } catch (error) {
          onPluginError?.(plugin.id, error);
        }
      },
    })) : graphView.contextMenu,
    contributions.contextMenu,
    context,
  );
  await pushAvailableGraphViewContributions<IGraphViewUiSlotContribution>(
    plugin,
    accessProviders,
    graphView.ui,
    contributions.ui,
    context,
  );
}

export async function listAvailableGraphViewContributionsForPlugins(
  pluginInfos: Iterable<IPluginInfo>,
  context: CorePluginAccessContext = {},
  onPluginError?: (pluginId: string, error: unknown) => void,
): Promise<CoreGraphViewContributionSet> {
  const pluginInfoList = Array.from(pluginInfos);
  const accessProviders = listPluginAccessProviders(pluginInfoList);
  const contributions = createEmptyGraphViewContributionSet();

  for (const info of pluginInfoList) {
    if (context.disabledPlugins?.has(info.plugin.id)) {
      continue;
    }

    try {
      const pluginAccess = await resolvePluginAccess(info.plugin, accessProviders, context);
      if (!pluginAccess.available) {
        continue;
      }

      await appendAvailableGraphViewContributions(
        info.plugin,
        accessProviders,
        contributions,
        context,
        onPluginError,
      );
    } catch (error) {
      onPluginError?.(info.plugin.id, error);
    }
  }

  return contributions;
}
