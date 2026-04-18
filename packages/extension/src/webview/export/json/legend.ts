import type { IGroup } from '../../../shared/settings/groups';

export function buildExportLegend(activeLegendRules: IGroup[]) {
  return activeLegendRules.map((group) => ({
    id: group.id,
    pattern: group.pattern,
    color: group.color,
    target: group.target ?? 'node',
    shape2D: group.shape2D,
    shape3D: group.shape3D,
    imagePath: group.imagePath,
    imageUrl: group.imageUrl,
    disabled: group.disabled,
    isPluginDefault: group.isPluginDefault,
    pluginName: group.pluginName,
  }));
}
