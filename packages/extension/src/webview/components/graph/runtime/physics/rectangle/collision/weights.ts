import type { FGNode } from '../../../../model/build';
import type { CollisionWeightShares, RectangleCollisionRect } from '../../model';
import { isExpandedGraphSection } from '../../section/state';

function getCollisionMoveWeight(node: FGNode): number {
	if (node.isDragging || node.isPinned) {
		return 0;
	}

	return 1;
}

function getRectangleCollisionMass(node: FGNode, rect: RectangleCollisionRect): number {
	if (isExpandedGraphSection(node)) {
		return Math.max(1, rect.width * rect.height);
	}

	const radius = Math.max(1, Math.min(rect.width, rect.height) / 2);
	return radius * radius;
}

export function getRectangleCollisionMoveShares(
	left: FGNode,
	right: FGNode,
	leftRect: RectangleCollisionRect,
	rightRect: RectangleCollisionRect,
): CollisionWeightShares | undefined {
	const leftMoveWeight = getCollisionMoveWeight(left);
	const rightMoveWeight = getCollisionMoveWeight(right);
	if (leftMoveWeight === 0 && rightMoveWeight === 0) {
		return undefined;
	}

	if (leftMoveWeight === 0) {
		return { left: 0, right: 1 };
	}

	if (rightMoveWeight === 0) {
		return { left: 1, right: 0 };
	}

	const leftMass = getRectangleCollisionMass(left, leftRect);
	const rightMass = getRectangleCollisionMass(right, rightRect);
	const totalMass = leftMass + rightMass;
	return {
		left: rightMass / totalMass,
		right: leftMass / totalMass,
	};
}
