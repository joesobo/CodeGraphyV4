import type { FGNode } from '../../model/build';

export function createNodeMap(nodes: readonly FGNode[]): Map<string, FGNode> {
	return new Map(nodes.map(node => [node.id, node]));
}
