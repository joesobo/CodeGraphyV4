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

export function buildGraphViewMergedGroups(
  userGroups: IGroup[],
  builtInDefaults: IGroup[],
  pluginDefaults: IGroup[],
  defaultLegendVisibility: Record<string, boolean> = {},
): IGroup[] {
  return [
    ...userGroups,
    ...applyDefaultLegendVisibilityOverrides(builtInDefaults, defaultLegendVisibility),
    ...applyDefaultLegendVisibilityOverrides(pluginDefaults, defaultLegendVisibility),
  ];
}
