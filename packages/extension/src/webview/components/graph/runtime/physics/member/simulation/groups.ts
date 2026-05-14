import type { GraphLayoutSettings } from '../../../../../../../shared/settings/graphLayout';
import type { FGNode } from '../../../../model/build';
import { getOwnerSectionId } from '../../ownership';

export function collectSectionMemberGroups(
	nodes: readonly FGNode[],
	graphLayout: GraphLayoutSettings,
): Map<string, FGNode[]> {
	const membersBySection = new Map<string, FGNode[]>();
	for (const node of nodes) {
		if (node.isGraphSection) {
			continue;
		}

		const ownerSectionId = getOwnerSectionId(node, graphLayout);
		if (!ownerSectionId || !graphLayout.sections[ownerSectionId] || graphLayout.sections[ownerSectionId].collapsed) {
			continue;
		}

		const members = membersBySection.get(ownerSectionId) ?? [];
		members.push(node);
		membersBySection.set(ownerSectionId, members);
	}

	return membersBySection;
}
