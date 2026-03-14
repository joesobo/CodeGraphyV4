import type { IGroup } from '../../../shared/types';

const PARTICLE_SPEED_MIN_INTERNAL = 0.0005;
const PARTICLE_SPEED_MAX_INTERNAL = 0.005;
const PARTICLE_SPEED_MIN_DISPLAY = 1;
const PARTICLE_SPEED_MAX_DISPLAY = 10;

export interface SettingsPanelGroupSection {
  sectionId: string;
  sectionName: string;
  groups: IGroup[];
}

export interface SettingsPanelGroupSections {
  userGroups: IGroup[];
  defaultSections: SettingsPanelGroupSection[];
}

export function isHexColor(value: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(value);
}

export function particleSpeedToDisplay(speed: number): number {
  const clamped = Math.min(
    PARTICLE_SPEED_MAX_INTERNAL,
    Math.max(PARTICLE_SPEED_MIN_INTERNAL, speed)
  );
  const ratio =
    (clamped - PARTICLE_SPEED_MIN_INTERNAL) /
    (PARTICLE_SPEED_MAX_INTERNAL - PARTICLE_SPEED_MIN_INTERNAL);
  return PARTICLE_SPEED_MIN_DISPLAY + ratio * (PARTICLE_SPEED_MAX_DISPLAY - PARTICLE_SPEED_MIN_DISPLAY);
}

export function particleSpeedFromDisplay(level: number): number {
  const clamped = Math.min(
    PARTICLE_SPEED_MAX_DISPLAY,
    Math.max(PARTICLE_SPEED_MIN_DISPLAY, level)
  );
  const ratio =
    (clamped - PARTICLE_SPEED_MIN_DISPLAY) /
    (PARTICLE_SPEED_MAX_DISPLAY - PARTICLE_SPEED_MIN_DISPLAY);
  return Number(
    (
      PARTICLE_SPEED_MIN_INTERNAL +
      ratio * (PARTICLE_SPEED_MAX_INTERNAL - PARTICLE_SPEED_MIN_INTERNAL)
    ).toFixed(6)
  );
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
