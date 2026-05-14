import type { GraphLayoutSettings } from '../../../../../../shared/settings/graphLayout';
import type { FGNode } from '../../../model/build';
import { getExpandedOwnerSectionId } from '../expandedOwnership';

export function touchesExpandedSectionMember(
	source: FGNode,
	target: FGNode,
	graphLayout: GraphLayoutSettings,
): boolean {
	return !!getExpandedOwnerSectionId(source, graphLayout)
		|| !!getExpandedOwnerSectionId(target, graphLayout);
}

export function getExternalBridgeEndpoint(
	source: FGNode,
	target: FGNode,
	graphLayout: GraphLayoutSettings,
): { externalNode: FGNode; memberNode: FGNode; ownerSectionId: string } | undefined {
	const sourceOwnerSectionId = getExpandedOwnerSectionId(source, graphLayout);
	const targetOwnerSectionId = getExpandedOwnerSectionId(target, graphLayout);
	if (sourceOwnerSectionId && sourceOwnerSectionId !== targetOwnerSectionId) {
		return { externalNode: target, memberNode: source, ownerSectionId: sourceOwnerSectionId };
	}

	if (targetOwnerSectionId && targetOwnerSectionId !== sourceOwnerSectionId) {
		return { externalNode: source, memberNode: target, ownerSectionId: targetOwnerSectionId };
	}

	return undefined;
}
