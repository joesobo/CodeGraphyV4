import type { FGNode } from '../../../../model/build';
import type { BoundsRect, NodeBoundsMargin } from '../../model';
import { isFiniteNumber, resolveNodeCoordinate } from '../../numeric';
import { getMemberBoundsMargin } from './margin';

function isPinnedInsideBounds(
	node: FGNode,
	bounds: BoundsRect,
	margin: NodeBoundsMargin,
): boolean {
	return isFiniteNumber(node.fx)
		&& isFiniteNumber(node.fy)
		&& node.fx >= bounds.x + margin.x
		&& node.fx <= bounds.x + bounds.width - margin.x
		&& node.fy >= bounds.y + margin.y
		&& node.fy <= bounds.y + bounds.height - margin.y;
}

export function getConstrainedMemberPosition(
	node: FGNode,
	bounds: BoundsRect,
): { margin: NodeBoundsMargin; x: number; y: number } | undefined {
	const margin = getMemberBoundsMargin(node);
	if (isPinnedInsideBounds(node, bounds, margin)) {
		return undefined;
	}

	const fallbackX = bounds.x + bounds.width / 2;
	const fallbackY = bounds.y + bounds.height / 2;
	return {
		margin,
		x: resolveNodeCoordinate(node.x, fallbackX),
		y: resolveNodeCoordinate(node.y, fallbackY),
	};
}
