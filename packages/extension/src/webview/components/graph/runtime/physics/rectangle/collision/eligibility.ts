import type { GraphLayoutSettings } from '../../../../../../../shared/settings/graphLayout';
import type { FGNode } from '../../../../model/build';
import { hasExpandedSectionMemberCollision, hasOwnedSectionMemberCollision } from './sectionMember';
import { hasExpandedSectionCollisionParticipant, isDraggingCircleAgainstExpandedSection } from './participants';

export function shouldApplyRectangleCollision(
	left: FGNode,
	right: FGNode,
	graphLayout: GraphLayoutSettings,
): boolean {
	if (!hasExpandedSectionCollisionParticipant(left, right)) {
		return false;
	}

	if (left.isDragging || right.isDragging) {
		return false;
	}

	if (isDraggingCircleAgainstExpandedSection(left, right)) {
		return false;
	}

	if (hasOwnedSectionMemberCollision(left, right, graphLayout)) {
		return false;
	}

	if (hasExpandedSectionMemberCollision(left, right, graphLayout)) {
		return false;
	}

	return true;
}
