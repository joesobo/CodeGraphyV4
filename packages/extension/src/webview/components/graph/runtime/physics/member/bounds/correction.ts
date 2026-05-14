import type { FGNode } from '../../../../model/build';
import type { BoundsRect } from '../../model';
import { isFiniteNumber } from '../../numeric';

export function applyConstrainedMemberCoordinates(
	node: FGNode,
	x: number,
	y: number,
): void {
	node.x = x;
	node.y = y;

	if (isFiniteNumber(node.fx)) {
		node.fx = x;
	}

	if (isFiniteNumber(node.fy)) {
		node.fy = y;
	}
}

export function applyMemberCenterVelocity(
	node: FGNode,
	bounds: BoundsRect,
	alpha: number,
	x: number,
	y: number,
	centerStrength: number,
): void {
	if (centerStrength === 0) {
		return;
	}

	const centerX = bounds.x + bounds.width / 2;
	const centerY = bounds.y + bounds.height / 2;
	node.vx = (node.vx ?? 0) + (centerX - x) * centerStrength * alpha;
	node.vy = (node.vy ?? 0) + (centerY - y) * centerStrength * alpha;
}
