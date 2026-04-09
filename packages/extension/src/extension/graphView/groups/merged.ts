import type { IGroup } from '../../../shared/settings/groups';

export function buildGraphViewMergedGroups(
  userGroups: IGroup[],
  builtInDefaults: IGroup[],
  pluginDefaults: IGroup[],
): IGroup[] {
  return [
    ...userGroups,
    ...builtInDefaults,
    ...pluginDefaults,
  ];
}
