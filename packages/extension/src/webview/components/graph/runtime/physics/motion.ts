import type { FGNode } from '../../model/build';
import type { NodeDelta } from './model';
import { isFiniteNumber, resolveNodeCoordinate } from './numeric';

export function getNodeDelta(left: FGNode, right: FGNode): NodeDelta {
	const deltaX = resolveNodeCoordinate(right.x, 0) - resolveNodeCoordinate(left.x, 0);
	const deltaY = resolveNodeCoordinate(right.y, 0) - resolveNodeCoordinate(left.y, 0);
	return {
		distance: Math.hypot(deltaX, deltaY) || 1,
		x: deltaX,
		y: deltaY,
	};
}

export function addNodeVelocity(node: FGNode, deltaX: number, deltaY: number): void {
	node.vx = (node.vx ?? 0) + deltaX;
	node.vy = (node.vy ?? 0) + deltaY;
}

export function addCappedNodeVelocity(
	node: FGNode,
	deltaX: number,
	deltaY: number,
	maxImpulse: number,
): void {
	const impulse = Math.hypot(deltaX, deltaY);
	if (impulse <= maxImpulse || impulse === 0) {
		addNodeVelocity(node, deltaX, deltaY);
		return;
	}

	const scale = maxImpulse / impulse;
	addNodeVelocity(node, deltaX * scale, deltaY * scale);
}

export function moveNodePosition(node: FGNode, deltaX: number, deltaY: number): void {
	node.x = resolveNodeCoordinate(node.x, 0) + deltaX;
	node.y = resolveNodeCoordinate(node.y, 0) + deltaY;
}

export function translateNodePosition(node: FGNode, deltaX: number, deltaY: number): void {
	if (node.isDragging) {
		return;
	}

	if (isFiniteNumber(node.x)) {
		node.x += deltaX;
	}

	if (isFiniteNumber(node.y)) {
		node.y += deltaY;
	}

	if (isFiniteNumber(node.fx)) {
		node.fx += deltaX;
	}

	if (isFiniteNumber(node.fy)) {
		node.fy += deltaY;
	}
}
