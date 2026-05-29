import { useMemo } from 'react';
import type { IPluginFilterPatternGroup } from '../../../../../shared/protocol/extensionToWebview';
import type { FilterSectionState } from './types';

export function isSectionEnabled(
  patterns: readonly string[],
  disabledPatterns: ReadonlySet<string>,
): boolean {
  return patterns.some(pattern => !disabledPatterns.has(pattern));
}

function getVisiblePluginGroups(
  pluginGroups: IPluginFilterPatternGroup[],
  pluginPatterns: string[],
): IPluginFilterPatternGroup[] {
  return pluginGroups.length > 0
    ? pluginGroups
    : [{ pluginId: 'plugin-defaults', pluginName: 'Plugin defaults', patterns: pluginPatterns }];
}

export function useFilterSectionState(
  customPatterns: string[],
  disabledCustomPatterns: string[],
  disabledPluginPatterns: string[],
  pluginGroups: IPluginFilterPatternGroup[],
  pluginPatterns: string[],
): FilterSectionState {
  const disabledCustom = useMemo(() => new Set(disabledCustomPatterns), [disabledCustomPatterns]);
  const disabledPlugin = useMemo(() => new Set(disabledPluginPatterns), [disabledPluginPatterns]);

  return {
    customSectionEnabled: isSectionEnabled(customPatterns, disabledCustom),
    disabledCustom,
    disabledPlugin,
    pluginSectionEnabled: isSectionEnabled(pluginPatterns, disabledPlugin),
    visiblePluginGroups: getVisiblePluginGroups(pluginGroups, pluginPatterns),
  };
}
