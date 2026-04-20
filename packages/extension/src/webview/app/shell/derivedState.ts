import { useMemo } from 'react';
import type { IGroup } from '../../../shared/settings/groups';

export function useFilterLegendInputs(
  filterPatterns: string[],
  pluginFilterPatterns: string[],
  disabledCustomFilterPatterns: string[],
  disabledPluginFilterPatterns: string[],
  legends: IGroup[],
): {
  activeFilterPatterns: string[];
  userLegendRules: IGroup[];
} {
  const activeFilterPatterns = useMemo(
    () => {
      const disabledCustom = new Set(disabledCustomFilterPatterns);
      const disabledPlugin = new Set(disabledPluginFilterPatterns);
      return [
        ...pluginFilterPatterns.filter(pattern => !disabledPlugin.has(pattern)),
        ...filterPatterns.filter(pattern => !disabledCustom.has(pattern)),
      ];
    },
    [disabledCustomFilterPatterns, disabledPluginFilterPatterns, filterPatterns, pluginFilterPatterns],
  );
  const userLegendRules = useMemo(
    () => legends.filter((legend) => !legend.isPluginDefault),
    [legends],
  );

  return {
    activeFilterPatterns,
    userLegendRules,
  };
}
