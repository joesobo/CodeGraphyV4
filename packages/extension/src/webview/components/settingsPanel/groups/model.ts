import type { IGroup } from '../../../../shared/types';

export interface SettingsPanelGroupSection {
  sectionId: string;
  sectionName: string;
  groups: IGroup[];
}

export interface SettingsPanelGroupSections {
  userGroups: IGroup[];
  defaultSections: SettingsPanelGroupSection[];
}

export function groupSettingsPanelSections(groups: IGroup[]): SettingsPanelGroupSections {
  const userGroups = groups.filter((group) => !group.isPluginDefault);
  const defaultGroups = groups.filter((group) => group.isPluginDefault);
  const sectionMap = new Map<string, SettingsPanelGroupSection>();

  for (const group of defaultGroups) {
    const sectionId = group.id.startsWith('default:')
      ? 'default'
      : group.id.match(/^plugin:([^:]+):/)?.[1] ?? 'unknown';
    const sectionName =
      group.id.startsWith('default:') ? group.pluginName ?? 'CodeGraphy' : group.pluginName ?? sectionId;

    const existingSection = sectionMap.get(sectionId);
    if (existingSection) {
      existingSection.groups.push(group);
      continue;
    }

    sectionMap.set(sectionId, {
      sectionId,
      sectionName,
      groups: [group],
    });
  }

  return {
    userGroups,
    defaultSections: [...sectionMap.values()],
  };
}

export function buildSettingsGroupOverride(
  group: IGroup,
  updates: Partial<IGroup>,
  overrideId: string
): IGroup {
  let inheritedImagePath = group.imagePath;
  if (inheritedImagePath && !inheritedImagePath.startsWith('plugin:')) {
    const pluginId = group.id.match(/^plugin:([^:]+):/)?.[1];
    if (pluginId) {
      inheritedImagePath = `plugin:${pluginId}:${inheritedImagePath}`;
    }
  }

  return {
    id: overrideId,
    pattern: group.pattern,
    color: group.color,
    shape2D: group.shape2D,
    shape3D: group.shape3D,
    imagePath: inheritedImagePath,
    ...updates,
  };
}

export function reorderSettingsGroups(
  groups: IGroup[],
  sourceIndex: number,
  targetIndex: number
): IGroup[] {
  if (
    sourceIndex < 0 ||
    targetIndex < 0 ||
    sourceIndex >= groups.length ||
    targetIndex >= groups.length ||
    sourceIndex === targetIndex
  ) {
    return groups;
  }

  const reordered = [...groups];
  const [movedGroup] = reordered.splice(sourceIndex, 1);
  reordered.splice(targetIndex, 0, movedGroup);
  return reordered;
}
