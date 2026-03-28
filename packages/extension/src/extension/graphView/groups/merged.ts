import type { IGroup } from '../../../shared/contracts';

export function buildGraphViewMergedGroups(
  userGroups: IGroup[],
  hiddenPluginGroupIds: ReadonlySet<string>,
  builtInDefaults: IGroup[],
  pluginDefaults: IGroup[],
): IGroup[] {
  const applyDisabledState = (group: IGroup): IGroup => {
    const lastColon = group.id.lastIndexOf(':');
    const sectionKey = lastColon > 0 ? group.id.slice(0, lastColon) : undefined;
    const isDisabled =
      hiddenPluginGroupIds.has(group.id) ||
      (sectionKey !== undefined && hiddenPluginGroupIds.has(sectionKey));
    return { ...group, disabled: isDisabled || undefined };
  };

  return [
    ...userGroups,
    ...builtInDefaults.map(applyDisabledState),
    ...pluginDefaults.map(applyDisabledState),
  ];
}
