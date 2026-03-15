import type { WebviewToExtensionMessage } from '../../../shared/types';
import { applyPluginGroupToggle } from './pluginGroupToggle';
import { applyPluginSectionToggle } from './pluginSectionToggle';

type GraphViewPluginGroupToggleMessage = Extract<
  WebviewToExtensionMessage,
  { type: 'TOGGLE_PLUGIN_GROUP_DISABLED' }
>;
type GraphViewPluginSectionToggleMessage = Extract<
  WebviewToExtensionMessage,
  { type: 'TOGGLE_PLUGIN_SECTION_DISABLED' }
>;

export interface GraphViewPluginHiddenGroupsContext {
  getHiddenPluginGroupIds(): Set<string>;
  updateHiddenPluginGroups(groupIds: string[]): Promise<void>;
  recomputeGroups(): void;
  sendGroupsUpdated(): void;
}

function createGraphViewPluginHiddenGroupsHandlers(context: GraphViewPluginHiddenGroupsContext) {
  return {
    hiddenPluginGroupIds: context.getHiddenPluginGroupIds(),
    updateHiddenPluginGroups: (groupIds: string[]) => context.updateHiddenPluginGroups(groupIds),
    recomputeGroups: () => context.recomputeGroups(),
    sendGroupsUpdated: () => context.sendGroupsUpdated(),
  };
}

export function dispatchGraphViewPluginGroupToggleMessage(
  message: GraphViewPluginGroupToggleMessage,
  context: GraphViewPluginHiddenGroupsContext,
): Promise<void> {
  return applyPluginGroupToggle(
    message.payload,
    createGraphViewPluginHiddenGroupsHandlers(context),
  );
}

export function dispatchGraphViewPluginSectionToggleMessage(
  message: GraphViewPluginSectionToggleMessage,
  context: GraphViewPluginHiddenGroupsContext,
): Promise<void> {
  return applyPluginSectionToggle(
    message.payload,
    createGraphViewPluginHiddenGroupsHandlers(context),
  );
}
