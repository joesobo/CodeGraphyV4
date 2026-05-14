import type { GraphLayoutSettings } from '../../../../../shared/settings/graphLayout';
import type { FGNode } from '../../model/build';
import { getOwnerSectionId } from './ownership';

export function hasExpandedOwnerSection(
	node: FGNode,
	graphLayout: GraphLayoutSettings,
): boolean {
	let ownerSectionId = getOwnerSectionId(node, graphLayout);
	const visited = new Set<string>();
	while (ownerSectionId) {
		if (visited.has(ownerSectionId)) {
			return false;
		}

		visited.add(ownerSectionId);
		const ownerSection = graphLayout.sections[ownerSectionId];
		if (ownerSection && !ownerSection.collapsed) {
			return true;
		}

		ownerSectionId = graphLayout.ownership[ownerSectionId]?.ownerSectionId ?? null;
	}

	return false;
}

export function getExpandedOwnerSectionId(
	node: FGNode,
	graphLayout: GraphLayoutSettings,
): string | null {
	let ownerSectionId = getOwnerSectionId(node, graphLayout);
	const visited = new Set<string>();
	while (ownerSectionId) {
		if (visited.has(ownerSectionId)) {
			return null;
		}

		visited.add(ownerSectionId);
		const ownerSection = graphLayout.sections[ownerSectionId];
		if (ownerSection && !ownerSection.collapsed) {
			return ownerSectionId;
		}

		ownerSectionId = graphLayout.ownership[ownerSectionId]?.ownerSectionId ?? null;
	}

	return null;
}

export function hasExpandedOwnerSectionById(
	nodeId: string | undefined,
	graphLayout: GraphLayoutSettings | undefined,
): boolean {
	if (!nodeId || !graphLayout) {
		return false;
	}

	return hasExpandedOwnerSection({ id: nodeId } as FGNode, graphLayout);
}
