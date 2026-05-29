import type { GraphContextNodeTarget } from '../decision/targets';
import { listAllows } from './listAllows';
import type { GraphViewContextMenuTargetSelector } from './model';

export function nodeMatches(
  node: GraphContextNodeTarget,
  selector: Extract<GraphViewContextMenuTargetSelector, { kind: 'node' | 'multiSelection' | 'runtimeNodeType' }>,
): boolean {
  const nodeTypes = 'nodeTypes' in selector ? selector.nodeTypes : undefined;
  return listAllows(nodeTypes, node.nodeType) &&
    listAllows(selector.runtimeNodeTypes, node.runtimeNodeType);
}
