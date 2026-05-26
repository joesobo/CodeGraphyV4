import type {
  GraphViewSettingsMessageHandlers,
  GraphViewSettingsMessageState,
} from '../../router';

export function sendFilterPatternsUpdated(
  state: GraphViewSettingsMessageState,
  handlers: GraphViewSettingsMessageHandlers,
  overrides: Partial<{
    disabledCustomPatterns: string[];
    disabledPluginPatterns: string[];
  }> = {},
): void {
  handlers.sendMessage({
    type: 'FILTER_PATTERNS_UPDATED',
    payload: {
      patterns: state.filterPatterns,
      pluginPatterns: handlers.getPluginFilterPatterns(),
      pluginPatternGroups: handlers.getPluginFilterGroups(),
      disabledCustomPatterns: overrides.disabledCustomPatterns
        ?? handlers.getConfig('disabledCustomFilterPatterns', []),
      disabledPluginPatterns: overrides.disabledPluginPatterns
        ?? handlers.getConfig('disabledPluginFilterPatterns', []),
    },
  });
}
