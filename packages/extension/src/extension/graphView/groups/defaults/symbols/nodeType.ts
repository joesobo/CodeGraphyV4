import type { IGraphData } from '../../../../../shared/graph/contracts';
import type { SymbolDefaultGroup } from './model';

export function nodeTypeMatchesGroup(
  group: SymbolDefaultGroup,
  node: IGraphData['nodes'][number],
): boolean {
  return !group.matchNodeType || group.matchNodeType === node.nodeType;
}
