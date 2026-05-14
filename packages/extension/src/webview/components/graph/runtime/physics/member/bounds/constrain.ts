import type { FGNode } from '../../../../model/build';
import type { BoundsRect } from '../../model';
import { clamp } from '../../numeric';
import { getSectionMemberBounds } from '../../section/bounds';
import { applyConstrainedMemberCoordinates, applyMemberCenterVelocity } from './correction';
import { getConstrainedMemberPosition } from './position';

export function constrainMemberNode(
	node: FGNode,
	bounds: BoundsRect,
	alpha: number,
	centerStrength: number,
): void {
	const memberBounds = getSectionMemberBounds(bounds);
	const position = getConstrainedMemberPosition(node, memberBounds);
	if (!position) {
		return;
	}

	const nextX = clamp(position.x, memberBounds.x + position.margin.x, memberBounds.x + memberBounds.width - position.margin.x);
	const nextY = clamp(position.y, memberBounds.y + position.margin.y, memberBounds.y + memberBounds.height - position.margin.y);

	applyConstrainedMemberCoordinates(node, nextX, nextY);
	applyMemberCenterVelocity(node, bounds, alpha, nextX, nextY, centerStrength);
}
