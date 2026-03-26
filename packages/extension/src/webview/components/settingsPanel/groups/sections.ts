import type { IGroup } from '../../../../shared/contracts';

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
      group.id.startsWith('default:')
        ? group.pluginName ?? 'CodeGraphy'
        : group.pluginName ?? sectionId;

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
