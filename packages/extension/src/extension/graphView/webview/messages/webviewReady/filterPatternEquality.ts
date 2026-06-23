import type { IPluginFilterPatternGroup } from '../../../../../shared/protocol/extensionToWebview';
import type { FilterPatternsPayload } from './filterPatterns';

export function areWebviewReadyFilterPatternsEqual(
  left: FilterPatternsPayload,
  right: FilterPatternsPayload,
): boolean {
  return areStringArraysEqual(left.patterns, right.patterns)
    && areStringArraysEqual(left.pluginPatterns, right.pluginPatterns)
    && arePluginFilterPatternGroupsEqual(left.pluginPatternGroups, right.pluginPatternGroups)
    && areStringArraysEqual(left.disabledCustomPatterns, right.disabledCustomPatterns)
    && areStringArraysEqual(left.disabledPluginPatterns, right.disabledPluginPatterns);
}

function areStringArraysEqual(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function arePluginFilterPatternGroupsEqual(
  left: readonly IPluginFilterPatternGroup[],
  right: readonly IPluginFilterPatternGroup[],
): boolean {
  return left.length === right.length
    && left.every((leftGroup, index) =>
      arePluginFilterPatternGroupEqual(leftGroup, right[index]),
    );
}

function arePluginFilterPatternGroupEqual(
  left: IPluginFilterPatternGroup,
  right: IPluginFilterPatternGroup | undefined,
): boolean {
  if (!right) {
    return false;
  }

  return left.pluginId === right.pluginId
    && left.pluginName === right.pluginName
    && areStringArraysEqual(left.patterns, right.patterns);
}
