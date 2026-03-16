import type { GraphViewPrimaryMessageContext } from './primary';
import type { GraphViewSettingsMessageState } from '../settings';

export function createGraphViewPrimarySettingsMessageState(
  context: GraphViewPrimaryMessageContext,
): GraphViewSettingsMessageState {
  return {
    activeViewId: context.getActiveViewId(),
    disabledPlugins: context.getDisabledPlugins(),
    disabledRules: context.getDisabledRules(),
    filterPatterns: context.getFilterPatterns(),
    graphData: context.getGraphData(),
    viewContext: context.getViewContext(),
  };
}
