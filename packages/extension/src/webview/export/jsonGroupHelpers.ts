import type { IGraphNode, IGroup } from '../../shared/contracts';
import { globMatch } from '../globMatch';
import type { ExportFile, ExportGroup } from './types';

export function buildGroupStyle(group: IGroup): ExportGroup['style'] {
  const style: ExportGroup['style'] = {
    color: group.color,
  };

  if (group.shape2D && group.shape2D !== 'circle') {
    style.shape2D = group.shape2D;
  }

  if (group.shape3D && group.shape3D !== 'sphere') {
    style.shape3D = group.shape3D;
  }

  if (group.imagePath) {
    style.image = group.imagePath;
  }

  return style;
}

export function buildNodeGroupMap(
  nodes: IGraphNode[],
  groups: IGroup[],
): Map<string, string> {
  const nodeGroupMap = new Map<string, string>();

  for (const node of nodes) {
    for (const group of groups) {
      if (globMatch(node.id, group.pattern)) {
        nodeGroupMap.set(node.id, group.pattern);
        break;
      }
    }
  }

  return nodeGroupMap;
}

export function createExportFile(imports?: Record<string, string[]>): ExportFile {
  return imports ? { imports } : {};
}
