import type { FGNode } from '../../../../model/build';
import type { RectangleCollisionRect, SectionCenter } from '../../model';
import { getFiniteVelocity, isFiniteNumber } from '../../numeric';
import { getGraphCollisionRadius } from '../../root/collision';
import { hasExpandedSectionCollisionSize } from '../../section/state';

function hasNodePosition(node: FGNode): node is FGNode & { x: number; y: number } {
	return isFiniteNumber(node.x) && isFiniteNumber(node.y);
}

function getProjectedNodeCenter(node: FGNode, projected: boolean): SectionCenter | undefined {
	if (!hasNodePosition(node)) {
		return undefined;
	}

	if (!projected) {
		return { x: node.x, y: node.y };
	}

	return { x: node.x + getFiniteVelocity(node.vx), y: node.y + getFiniteVelocity(node.vy) };
}

export function createRectangleCollisionRect(center: SectionCenter, width: number, height: number): RectangleCollisionRect {
	return {
		centerX: center.x,
		centerY: center.y,
		height,
		width,
		x: center.x - (width / 2),
		y: center.y - (height / 2),
	};
}

export function getNodeRectangleCollisionRect(node: FGNode, projected = false): RectangleCollisionRect | undefined {
	const center = getProjectedNodeCenter(node, projected);
	if (!center) {
		return undefined;
	}

	if (hasExpandedSectionCollisionSize(node)) {
		return createRectangleCollisionRect(center, node.sectionWidth, node.sectionHeight);
	}

	const radius = getGraphCollisionRadius(node);
	return createRectangleCollisionRect(center, radius * 2, radius * 2);
}
