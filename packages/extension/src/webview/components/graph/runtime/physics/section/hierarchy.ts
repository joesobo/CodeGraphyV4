import type { GraphLayoutSettings } from '../../../../../../shared/settings/graphLayout';

export function getSectionDepth(
	sectionId: string,
	graphLayout: GraphLayoutSettings,
): number {
	let depth = 0;
	let ownerSectionId = graphLayout.ownership[sectionId]?.ownerSectionId ?? null;
	const visited = new Set<string>([sectionId]);

	while (ownerSectionId) {
		if (visited.has(ownerSectionId)) {
			return depth;
		}

		visited.add(ownerSectionId);
		depth += 1;
		ownerSectionId = graphLayout.ownership[ownerSectionId]?.ownerSectionId ?? null;
	}

	return depth;
}

export function getSectionIdsByDepth(graphLayout: GraphLayoutSettings): string[] {
	return Object.keys(graphLayout.sections)
		.sort((left, right) => getSectionDepth(left, graphLayout) - getSectionDepth(right, graphLayout));
}
