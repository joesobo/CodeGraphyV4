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
  legendOrder: readonly string[],
): IGroup[] {
  if (legendOrder.length === 0) {
    return groups;
  }

  const orderById = new Map(
    legendOrder.map((legendId, index) => [legendId, index] as const),
  );

  return [...groups].sort((left, right) => {
    const leftIndex = orderById.get(left.id);
    const rightIndex = orderById.get(right.id);

    if (leftIndex === undefined && rightIndex === undefined) {
      return 0;
    }
    if (leftIndex === undefined) {
      return 1;
    }
    if (rightIndex === undefined) {
      return -1;
    }

    return leftIndex - rightIndex;
  });
}

export function buildGraphViewMergedGroups(
  userGroups: IGroup[],
  builtInDefaults: IGroup[],
  pluginDefaults: IGroup[],
  defaultLegendVisibility: Record<string, boolean> = {},
  legendOrder: readonly string[] = [],
): IGroup[] {
  return sortGroupsByLegendOrder([
    ...userGroups,
    ...applyDefaultLegendVisibilityOverrides(builtInDefaults, defaultLegendVisibility),
    ...applyDefaultLegendVisibilityOverrides(pluginDefaults, defaultLegendVisibility),
  ], legendOrder);
}
