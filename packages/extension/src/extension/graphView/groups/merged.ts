import type { IGroup } from '../../../shared/settings/groups';

function applyDefaultLegendVisibilityOverrides(
  groups: IGroup[],
  visibility: Record<string, boolean>,
): IGroup[] {
  return groups.map((group) => {
    const visible = visibility[group.id];
    if (typeof visible !== 'boolean') {
      return group;
    }

    return {
      ...group,
      disabled: !visible,
    };
  });
}

function sortGroupsByLegendOrder(
  groups: IGroup[],
  legendOrder: readonly string[] | undefined,
): IGroup[] {
  const resolvedLegendOrder = legendOrder ?? [];
  const orderById = new Map(
    resolvedLegendOrder.map((legendId, index) => [legendId, index] as const),
  );
  const fallbackIndex = resolvedLegendOrder.length;

  return [...groups].sort((left, right) => {
    const leftIndex = orderById.get(left.id) ?? fallbackIndex;
    const rightIndex = orderById.get(right.id) ?? fallbackIndex;
    return leftIndex - rightIndex;
  });
}

export function buildGraphViewMergedGroups(
  userGroups: IGroup[],
  builtInDefaults: IGroup[],
  pluginDefaults: IGroup[],
  defaultLegendVisibility: Record<string, boolean> = {},
  legendOrder?: readonly string[],
): IGroup[] {
  return sortGroupsByLegendOrder([
    ...userGroups,
    ...applyDefaultLegendVisibilityOverrides(builtInDefaults, defaultLegendVisibility),
    ...applyDefaultLegendVisibilityOverrides(pluginDefaults, defaultLegendVisibility),
  ], legendOrder);
}
