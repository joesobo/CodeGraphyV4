import type { FGNode } from '../../../model/build';
import { getRectangularNodeArea2D, getRectangularNodeAreaRadius } from '../../../model/node/rectangularArea';
import { COLLISION_PADDING } from '../model';

type GraphCollisionNode = Pick<FGNode, 'collisionRadius2D' | 'shapeSize2D' | 'size'>;

function readCollisionRadiusOverride(node: GraphCollisionNode): number | undefined {
	const radius = node.collisionRadius2D;
	return typeof radius === 'number' && Number.isFinite(radius) && radius >= 0
		? radius
		: undefined;
}

export function getGraphCollisionRadius(node: GraphCollisionNode): number {
	const collisionRadius = readCollisionRadiusOverride(node);
	if (collisionRadius !== undefined) {
		return collisionRadius + COLLISION_PADDING;
	}

	const visualArea = getRectangularNodeArea2D(node.shapeSize2D);
	if (visualArea) {
		return getRectangularNodeAreaRadius(visualArea) + COLLISION_PADDING;
	}

	return (node.size ?? 0) + COLLISION_PADDING;
}

export function getRootGraphCollisionRadius(node: FGNode): number {
	return getGraphCollisionRadius(node);
}

export function getRootGraphCenterStrength(centerForce: number): number {
	return centerForce;
}
