import type { GraphViewPrimaryMessageContext } from './primary';
import type { GraphViewLegendMessageState } from '../messages/legends';
import type { GraphViewNodeFileHandlers } from '../nodeFile/router';
import type { GraphViewSettingsMessageState } from '../settingsMessages/router';

export function createGraphViewPrimaryLegendMessageState(
  context: GraphViewPrimaryMessageContext,
): GraphViewLegendMessageState {
  return {
    userLegends: context.getUserGroups(),
  };
}

export function createGraphViewPrimaryNodeFileHandlers(
  context: GraphViewPrimaryMessageContext,
): GraphViewNodeFileHandlers {
  return {
    ...context,
    indexGraph: () => context.indexAndSendData(),
    refreshGraph: () => context.refreshIndex(),
    timelineActive: context.getTimelineActive(),
    currentCommitSha: context.getCurrentCommitSha(),
  };
}

export function createGraphViewPrimarySettingsMessageState(
  context: GraphViewPrimaryMessageContext,
): GraphViewSettingsMessageState {
  return {
    disabledPlugins: context.getDisabledPlugins(),
    filterPatterns: context.getFilterPatterns(),
  };
}
