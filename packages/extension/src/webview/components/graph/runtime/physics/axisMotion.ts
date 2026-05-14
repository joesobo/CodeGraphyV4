import type { FGNode } from '../../model/build';
import type { CollisionAxis } from './model';
import { clamp } from './numeric';

export function addAxisVelocity(node: FGNode, axis: CollisionAxis, delta: number): void {
	if (axis === 'x') {
		node.vx = (node.vx ?? 0) + delta;
		return;
	}

	if (axis === 'y') {
		node.vy = (node.vy ?? 0) + delta;
	}
}

export function addBoundedAxisVelocity(
	node: FGNode,
	axis: CollisionAxis,
	delta: number,
	maxImpulse: number,
): void {
	addAxisVelocity(node, axis, clamp(delta, -maxImpulse, maxImpulse));
}
