import type { GraphLayoutSettings } from '../../../../../shared/settings/graphLayout';
import type { FGNode } from '../../model/build';

export function getOwnerSectionId(
	node: FGNode,
	graphLayout: GraphLayoutSettings,
): string | null {
	return node.ownerSectionId !== undefined
		? node.ownerSectionId
		: graphLayout.ownership[node.id]?.ownerSectionId ?? null;
}

export function isOwnedBySection(
	node: FGNode,
	sectionId: string,
	graphLayout: GraphLayoutSettings,
): boolean {
	let ownerSectionId = getOwnerSectionId(node, graphLayout);
	const visited = new Set<string>();
	while (ownerSectionId) {
		if (ownerSectionId === sectionId) {
			return true;
		}

		if (visited.has(ownerSectionId)) {
			return false;
		}

		visited.add(ownerSectionId);
		ownerSectionId = graphLayout.ownership[ownerSectionId]?.ownerSectionId ?? null;
	}

	return false;
}
