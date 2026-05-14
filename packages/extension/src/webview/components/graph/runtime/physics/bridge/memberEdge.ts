import type { FGNode } from '../../../model/build';
import type { BoundsRect, SectionEdge } from '../model';
import { getMemberBoundsMargin } from '../member/bounds/margin';
import { getSectionMemberBounds } from '../section/bounds';
import { getBridgePressEdge, hasBridgeEndpointPositions } from './pressDirection';

function isMemberAtSectionEdge(
	memberNode: FGNode,
	sectionBounds: BoundsRect,
	edge: SectionEdge,
): boolean {
	const memberBounds = getSectionMemberBounds(sectionBounds);
	const margin = getMemberBoundsMargin(memberNode);
	const minX = memberBounds.x + margin.x;
	const maxX = memberBounds.x + memberBounds.width - margin.x;
	const minY = memberBounds.y + margin.y;
	const maxY = memberBounds.y + memberBounds.height - margin.y;
	const tolerance = Math.max(1, Math.min(margin.x, margin.y) / 2);

	switch (edge) {
		case 'bottom':
			return memberNode.y! >= maxY - tolerance;
		case 'left':
			return memberNode.x! <= minX + tolerance;
		case 'right':
			return memberNode.x! >= maxX - tolerance;
		case 'top':
			return memberNode.y! <= minY + tolerance;
	}
}

export function isMemberPressedTowardSectionEdge(
	memberNode: FGNode,
	externalNode: FGNode,
	sectionBounds: BoundsRect,
): boolean {
	if (!hasBridgeEndpointPositions(memberNode, externalNode)) {
		return false;
	}

	return isMemberAtSectionEdge(memberNode, sectionBounds, getBridgePressEdge(memberNode, externalNode));
}
