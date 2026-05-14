import type { FGNode } from '../../../../model/build';
import { addNodeVelocity, getNodeDelta, moveNodePosition } from '../../motion';
import { getMemberCollisionRadius } from './settings';
import { getMemberCollisionWeightShares } from './weights';

function getActiveCollisionVelocityShare(weightShare: number): number {
	return weightShare > 0 ? 0.5 : 0;
}

export function applyMemberCircleCollision(
	left: FGNode,
	right: FGNode,
	alpha: number,
): void {
	const delta = getNodeDelta(left, right);
	const minimumDistance = getMemberCollisionRadius(left) + getMemberCollisionRadius(right);
	if (delta.distance >= minimumDistance) {
		return;
	}

	const weights = getMemberCollisionWeightShares(left, right);
	if (!weights) {
		return;
	}

	const normalX = delta.x / delta.distance;
	const normalY = delta.y / delta.distance;
	const overlap = minimumDistance - delta.distance;
	const leftVelocityShare = getActiveCollisionVelocityShare(weights.left);
	const rightVelocityShare = getActiveCollisionVelocityShare(weights.right);
	moveNodePosition(left, -normalX * overlap * weights.left, -normalY * overlap * weights.left);
	moveNodePosition(right, normalX * overlap * weights.right, normalY * overlap * weights.right);
	addNodeVelocity(left, -normalX * overlap * alpha * leftVelocityShare, -normalY * overlap * alpha * leftVelocityShare);
	addNodeVelocity(right, normalX * overlap * alpha * rightVelocityShare, normalY * overlap * alpha * rightVelocityShare);
}
