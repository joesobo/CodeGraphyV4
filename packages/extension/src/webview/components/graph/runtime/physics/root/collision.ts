import type { FGNode } from '../../../model/build';
import { COLLISION_PADDING } from '../model';

export function getGraphCollisionRadius(node: FGNode): number {
	return (node.size ?? 0) + COLLISION_PADDING;
}

export function getRootGraphCollisionRadius(node: FGNode): number {
	return getGraphCollisionRadius(node);
}

export function getRootGraphCenterStrength(centerForce: number): number {
	return centerForce;
}
