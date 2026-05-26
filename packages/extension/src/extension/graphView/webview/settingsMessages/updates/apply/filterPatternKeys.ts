import type {
  GraphViewSettingsMessageHandlers,
  GraphViewSettingsMessageState,
} from '../../router';

export type FilterPatternSource = 'custom' | 'plugin';

export function getNextDisabledFilterPatterns(
  currentPatterns: readonly string[],
  pattern: string,
  enabled: boolean,
): string[] {
  const nextPatterns = new Set(currentPatterns);
  if (enabled) {
    nextPatterns.delete(pattern);
  } else {
    nextPatterns.add(pattern);
  }

  return Array.from(nextPatterns);
}

export function getDisabledFilterPatternConfigKey(
  source: FilterPatternSource,
): 'disabledCustomFilterPatterns' | 'disabledPluginFilterPatterns' {
  return source === 'custom'
    ? 'disabledCustomFilterPatterns'
    : 'disabledPluginFilterPatterns';
}

export function getFilterPatternStateOverrideKey(
  source: FilterPatternSource,
): 'disabledCustomPatterns' | 'disabledPluginPatterns' {
  return source === 'custom'
    ? 'disabledCustomPatterns'
    : 'disabledPluginPatterns';
}

export function getGroupDisabledFilterPatterns(
  source: FilterPatternSource,
  enabled: boolean,
  state: GraphViewSettingsMessageState,
  handlers: GraphViewSettingsMessageHandlers,
): string[] {
  if (enabled) {
    return [];
  }

  return source === 'custom'
    ? [...state.filterPatterns]
    : handlers.getPluginFilterPatterns();
}
