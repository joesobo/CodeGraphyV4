import type { IGraphData } from '../../../shared/graph/types';
import type { IGroup } from '../../../shared/settings/groups';
import { globMatch } from '../../globMatch';

function getNodeLegendIds(nodeId: string, activeLegendRules: IGroup[]): string[] {
  return activeLegendRules
    .filter((group) => globMatch(nodeId, group.pattern))
    .map((group) => group.id);
}

export function buildExportNodes(graphData: IGraphData, activeLegendRules: IGroup[]) {
  return [...graphData.nodes]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((node) => ({
      id: node.id,
      label: node.label,
      nodeType: node.nodeType ?? 'file',
      color: node.color,
      legendIds: getNodeLegendIds(node.id, activeLegendRules),
      fileSize: node.fileSize,
      accessCount: node.accessCount,
      x: node.x,
      y: node.y,
    }));
}
