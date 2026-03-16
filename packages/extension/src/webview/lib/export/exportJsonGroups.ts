import type { IGraphNode, IGroup } from '../../../shared/types';
import { globMatch } from '../globMatch';
import type { ExportFile, ExportGroup, ExportImagesSectionEntry } from './exportTypes';

export interface ExportGroupedSections {
  groupsRecord: Record<string, ExportGroup>;
  ungroupedFiles: Record<string, ExportFile>;
  imagesRecord: Record<string, ExportImagesSectionEntry>;
}

export function buildGroupedSections(
  nodes: IGraphNode[],
  groups: IGroup[],
  importsMap: Map<string, Record<string, string[]>>,
): ExportGroupedSections {
  const sortedNodes = [...nodes].sort((left, right) => left.id.localeCompare(right.id));
  const activeGroups = groups.filter(group => !group.disabled);
  const nodeGroupMap = buildNodeGroupMap(sortedNodes, activeGroups);
  const groupedFileMaps = new Map<string, Record<string, ExportFile>>();
  const ungroupedFiles: Record<string, ExportFile> = {};

  for (const node of sortedNodes) {
    const file = createExportFile(importsMap.get(node.id));
    const groupPattern = nodeGroupMap.get(node.id);

    if (!groupPattern) {
      ungroupedFiles[node.id] = file;
      continue;
    }

    const fileMap = groupedFileMaps.get(groupPattern);
    if (fileMap) {
      fileMap[node.id] = file;
    } else {
      groupedFileMaps.set(groupPattern, { [node.id]: file });
    }
  }

  const groupsRecord: Record<string, ExportGroup> = {};
  const imagesRecord: Record<string, ExportImagesSectionEntry> = {};

  for (const group of activeGroups) {
    const files = groupedFileMaps.get(group.pattern);
    if (!files) {
      continue;
    }

    groupsRecord[group.pattern] = {
      style: buildGroupStyle(group),
      files,
    };

    if (!group.imagePath) {
      continue;
    }

    if (!imagesRecord[group.imagePath]) {
      imagesRecord[group.imagePath] = { groups: [] };
    }

    imagesRecord[group.imagePath].groups.push(group.pattern);
  }

  return {
    groupsRecord,
    ungroupedFiles,
    imagesRecord,
  };
}

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

function buildNodeGroupMap(
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

function createExportFile(imports?: Record<string, string[]>): ExportFile {
  return imports ? { imports } : {};
}
