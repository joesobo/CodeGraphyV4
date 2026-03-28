import type { IGroup } from '../../../../shared/contracts';

export function buildSettingsGroupOverride(
  group: IGroup,
  updates: Partial<IGroup>,
  overrideId: string,
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
