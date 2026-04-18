import { useMemo } from 'react';
import type { IGroup } from '../../../shared/settings/groups';

export function useFilterLegendInputs(
  filterPatterns: string[],
  pluginFilterPatterns: string[],
  legends: IGroup[],
): {
  activeFilterPatterns: string[];
  userLegendRules: IGroup[];
} {
  const activeFilterPatterns = useMemo(
    () => [...pluginFilterPatterns, ...filterPatterns],
    [filterPatterns, pluginFilterPatterns],
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
