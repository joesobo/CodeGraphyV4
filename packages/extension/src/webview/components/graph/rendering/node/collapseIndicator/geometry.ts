import type { FGNode } from '../../../model/build';

export function getNodeCollapseIndicatorCenter(node: FGNode): { x: number; y: number } {
	return {
		x: node.x! - node.size * 0.58,
		y: node.y! - node.size * 0.58,
	};
}
