import type { FGNode } from '../../../../model/build';
import {
	SECTION_RECTANGLE_MAX_COLLISION_IMPULSE,
	SECTION_RECTANGLE_MAX_SECTION_IMPULSE,
	type CollisionAxis,
	type RectangleCollisionRect,
} from '../../model';
import { addBoundedAxisVelocity } from '../../axisMotion';
import { isExpandedGraphSection } from '../../section/state';
import { getRectangleCollisionMoveShares } from './weights';

export function getCollisionDirection(left: FGNode, right: FGNode, leftCenter: number, rightCenter: number): number {
	if (leftCenter < rightCenter) {
		return -1;
	}

	if (leftCenter > rightCenter) {
		return 1;
	}

	return left.id < right.id ? -1 : 1;
}

function getRectangleCollisionMaxImpulse(left: FGNode, right: FGNode): number {
	return isExpandedGraphSection(left) && isExpandedGraphSection(right)
		? SECTION_RECTANGLE_MAX_SECTION_IMPULSE
		: SECTION_RECTANGLE_MAX_COLLISION_IMPULSE;
}

export function applyRectangleCollisionVelocity(
	left: FGNode,
	right: FGNode,
	leftRect: RectangleCollisionRect,
	rightRect: RectangleCollisionRect,
	axis: CollisionAxis,
	direction: number,
	overlap: number,
): void {
	const shares = getRectangleCollisionMoveShares(left, right, leftRect, rightRect);
	if (!shares) {
		return;
	}

	const maxImpulse = getRectangleCollisionMaxImpulse(left, right);
	addBoundedAxisVelocity(left, axis, direction * overlap * shares.left, maxImpulse);
	addBoundedAxisVelocity(right, axis, -direction * overlap * shares.right, maxImpulse);
}
