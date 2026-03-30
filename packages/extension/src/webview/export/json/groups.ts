import type { IGraphNode } from '../../../shared/graph/types';
import type { IGroup } from '../../../shared/settings/groups';
import type { ExportFile, ExportGroup, ExportImagesSectionEntry } from '../shared/contracts';
import {
  buildGroupStyle as buildGroupStyleHelper,
  buildNodeGroupMap,
  createExportFile,
} from './groupHelpers';

export interface ExportGroupedSections {
  groupsRecord: Record<string, ExportGroup>;
  ungroupedFiles: Record<string, ExportFile>;
  imagesRecord: Record<string, ExportImagesSectionEntry>;
}

export const buildGroupStyle = buildGroupStyleHelper;

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
