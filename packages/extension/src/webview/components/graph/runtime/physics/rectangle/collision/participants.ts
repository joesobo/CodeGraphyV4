import type { FGNode } from '../../../../model/build';
import { isExpandedGraphSection } from '../../section/state';

export function hasExpandedSectionCollisionParticipant(left: FGNode, right: FGNode): boolean {
	return isExpandedGraphSection(left) || isExpandedGraphSection(right);
}

export function isDraggingCircleAgainstExpandedSection(left: FGNode, right: FGNode): boolean {
	const leftIsExpandedSection = isExpandedGraphSection(left);
	const rightIsExpandedSection = isExpandedGraphSection(right);
	if (leftIsExpandedSection && !rightIsExpandedSection) {
		return !!right.isDragging;
	}

	if (rightIsExpandedSection && !leftIsExpandedSection) {
		return !!left.isDragging;
	}

	return false;
}
