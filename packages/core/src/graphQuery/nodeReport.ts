import type { IGraphNode, NodeType } from '../graph/contracts';
import { getNodeType } from '../visibleGraph/model';
import type { GraphQueryNodeReportItem } from './model';

export function toNodeReportItem(node: IGraphNode): GraphQueryNodeReportItem {
  return {
    path: node.id,
    nodeType: getNodeType(node) as NodeType,
  };
}

export function readNodeReportValue(item: GraphQueryNodeReportItem, field: string): string {
  switch (field) {
    case 'path':
      return item.path;
    case 'nodeType':
      return item.nodeType;
    default:
      return '';
  }
}
