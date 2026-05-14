import type { GraphLayoutSettings } from '../../../../../../../shared/settings/graphLayout';
import type { FGNode } from '../../../../model/build';
import { hasExpandedOwnerSection } from '../../expandedOwnership';
import { isOwnedBySection } from '../../ownership';

export function hasOwnedSectionMemberCollision(
	left: FGNode,
	right: FGNode,
	graphLayout: GraphLayoutSettings,
): boolean {
	if (left.isGraphSection && isOwnedBySection(right, left.id, graphLayout)) {
		return true;
	}

	return !!right.isGraphSection && isOwnedBySection(left, right.id, graphLayout);
}

export function hasExpandedSectionMemberCollision(
	left: FGNode,
	right: FGNode,
	graphLayout: GraphLayoutSettings,
): boolean {
	if (left.isGraphSection && hasExpandedOwnerSection(right, graphLayout)) {
		return true;
	}

	return !!right.isGraphSection && hasExpandedOwnerSection(left, graphLayout);
}
