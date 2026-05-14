import type { FGNode } from '../../../../model/build';
import { SECTION_MEMBER_PADDING, type NodeBoundsMargin } from '../../model';
import { isFiniteNumber } from '../../numeric';
import { isExpandedGraphSection } from '../../section/state';

export function getMemberBoundsMargin(node: FGNode): NodeBoundsMargin {
	if (
		isExpandedGraphSection(node)
		&& isFiniteNumber(node.sectionHeight)
		&& isFiniteNumber(node.sectionWidth)
	) {
		return {
			x: (node.sectionWidth / 2) + SECTION_MEMBER_PADDING,
			y: (node.sectionHeight / 2) + SECTION_MEMBER_PADDING,
		};
	}

	const margin = Math.max(1, node.size ?? 1) + SECTION_MEMBER_PADDING;
	return { x: margin, y: margin };
}
