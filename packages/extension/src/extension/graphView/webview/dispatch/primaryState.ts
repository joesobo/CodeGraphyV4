import type { GraphViewPrimaryMessageContext } from './primary';
import type { GraphViewGroupMessageState } from '../messages/groups';
import type { GraphViewNodeFileHandlers } from '../nodeFile/router';
import type { GraphViewSettingsMessageState } from '../settingsMessages/router';

export function createGraphViewPrimaryGroupMessageState(
  context: GraphViewPrimaryMessageContext,
): GraphViewGroupMessageState {
  return {
    userGroups: context.getUserGroups(),
  };
}

export function createGraphViewPrimaryNodeFileHandlers(
  context: GraphViewPrimaryMessageContext,
): GraphViewNodeFileHandlers {
  return {
    ...context,
    timelineActive: context.getTimelineActive(),
    currentCommitSha: context.getCurrentCommitSha(),
  };
}

export function createGraphViewPrimarySettingsMessageState(
  context: GraphViewPrimaryMessageContext,
): GraphViewSettingsMessageState {
  return {
    disabledPlugins: context.getDisabledPlugins(),
    disabledSources: context.getDisabledRules(),
    filterPatterns: context.getFilterPatterns(),
    graphData: context.getGraphData(),
  };
}
