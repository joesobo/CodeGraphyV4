import type { IGraphNode, NodeType } from '../graph/contracts';
import { getNodeType } from '../visibleGraph/model';
import type { GraphQueryNodeReportItem } from './model';

export function toNodeReportItem(node: IGraphNode): GraphQueryNodeReportItem {
  return {
    path: node.id,
    nodeType: getNodeType(node) as NodeType,
    ...(node.symbol ? { symbol: { ...node.symbol } } : {}),
  };
}

export function readNodeReportValue(item: GraphQueryNodeReportItem, field: string): string {
  switch (field) {
    case 'path':
      return item.path;
    case 'nodeType':
      return item.nodeType;
    case 'name':
      return item.symbol?.name ?? '';
    case 'kind':
      return item.symbol?.kind ?? '';
    case 'filePath':
      return item.symbol?.filePath ?? '';
    default:
      return '';
  }
}
