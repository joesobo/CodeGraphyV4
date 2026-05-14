import type { FGNode } from '../../../../model/build';
import type { CollisionWeightShares } from '../../model';

function getMemberCollisionWeight(node: FGNode): number {
	return node.isDragging || node.isPinned ? 0 : 1;
}

export function getMemberCollisionWeightShares(left: FGNode, right: FGNode): CollisionWeightShares | undefined {
	const leftWeight = getMemberCollisionWeight(left);
	const rightWeight = getMemberCollisionWeight(right);
	const totalWeight = leftWeight + rightWeight;
	return totalWeight === 0
		? undefined
		: {
			left: leftWeight / totalWeight,
			right: rightWeight / totalWeight,
		};
}
