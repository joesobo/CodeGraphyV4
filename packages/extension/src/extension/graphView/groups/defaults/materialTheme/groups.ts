import type { IGroup } from '../../../../../shared/settings/groups';
import type { MaterialIconData, MaterialMatch } from './model';

export function createMaterialGroup(
  match: MaterialMatch,
  iconData: MaterialIconData,
  color = iconData.color,
): IGroup {
  return {
    id: `default:${match.kind}:${match.key}`,
    pattern: match.kind === 'fileExtension' ? `*.${match.key}` : match.key,
    color,
    imageUrl: iconData.imageUrl,
    isPluginDefault: true,
    pluginName: 'Material Icon Theme',
  };
}

export function getSpecificityScore(group: IGroup): number {
  if (group.pattern.includes('/')) {
    return 3;
  }

  if (!group.pattern.startsWith('*.')) {
    return 2;
  }

  return 1;
}

export function getManualGroups(): IGroup[] {
  return [
    {
      id: 'default:fileName:.codegraphy/settings.json',
      pattern: '.codegraphy/settings.json',
      color: '#277ACC',
      isPluginDefault: true,
      pluginName: 'Material Icon Theme',
    },
  ];
}

export function sortMaterialGroups(groups: IGroup[]): IGroup[] {
  return groups.sort((left, right) => {
    const specificity = getSpecificityScore(right) - getSpecificityScore(left);
    if (specificity !== 0) {
      return specificity;
    }

    return right.pattern.length - left.pattern.length;
  });
}
