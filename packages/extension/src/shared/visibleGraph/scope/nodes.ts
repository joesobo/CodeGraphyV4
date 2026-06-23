import type { IGraphData } from '../../graph/contracts';
import { CORE_GRAPH_NODE_TYPES } from '../../graphControls/defaults/definitions';
import { getNodeType } from '../model';
import type { ScopedSymbolDefinition } from './definitions';
import { symbolMatchesScopedDefinition } from './symbolMatch';

const CORE_NODE_TYPE_BY_ID = new Map(CORE_GRAPH_NODE_TYPES.map((definition) => [definition.id, definition]));

function hasDisabledAncestor(
	parentId: string | undefined,
	disabledNodeTypes: ReadonlySet<string>,
): boolean {
	let currentParentId = parentId;
	while (currentParentId) {
		if (disabledNodeTypes.has(currentParentId)) {
			return true;
		}
		currentParentId = CORE_NODE_TYPE_BY_ID.get(currentParentId)?.parentId;
	}

	return false;
}

function nodeTypeHasDisabledAncestor(
	nodeType: string,
	disabledNodeTypes: ReadonlySet<string>,
): boolean {
	return hasDisabledAncestor(CORE_NODE_TYPE_BY_ID.get(nodeType)?.parentId, disabledNodeTypes);
}

function getScopedSymbolVisibility(
	node: IGraphData['nodes'][number],
	scopedSymbolDefinitions: readonly ScopedSymbolDefinition[],
): ScopedSymbolDefinition | undefined {
	const matchingDefinition = scopedSymbolDefinitions.find((item) => (
		symbolMatchesScopedDefinition(node, item)
	));

	return matchingDefinition;
}

export function nodeMatchesScope(
	node: IGraphData['nodes'][number],
	disabledNodeTypes: ReadonlySet<string>,
	scopedSymbolDefinitions: readonly ScopedSymbolDefinition[],
): boolean {
	const scopedSymbolDefinition = getScopedSymbolVisibility(node, scopedSymbolDefinitions);
	if (
		scopedSymbolDefinition?.definition.parentId
		&& hasDisabledAncestor(scopedSymbolDefinition.definition.parentId, disabledNodeTypes)
	) {
		return false;
	}

	const nodeType = getNodeType(node);
	if (disabledNodeTypes.has(nodeType) || nodeTypeHasDisabledAncestor(nodeType, disabledNodeTypes)) {
		return false;
	}

	if (scopedSymbolDefinition) {
		return scopedSymbolDefinition.enabled;
	}

	if (node.symbol) {
		return false;
	}

	return true;
}
