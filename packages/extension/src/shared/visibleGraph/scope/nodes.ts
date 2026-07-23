import type { IGraphData } from '../../graph/contracts';
import type { IGraphNodeTypeDefinition } from '../../graphControls/contracts';
import { CORE_GRAPH_NODE_TYPES } from '../../graphControls/defaults/definitions';
import { getNodeType } from '../model';
import type { ScopedSymbolDefinition } from './definitions';
import { symbolMatchesScopedDefinition } from './symbolMatch';

function hasDisabledAncestor(
	parentId: string | undefined,
	disabledNodeTypes: ReadonlySet<string>,
	nodeTypeById: ReadonlyMap<string, IGraphNodeTypeDefinition>,
): boolean {
	let currentParentId = parentId;
	while (currentParentId) {
		if (disabledNodeTypes.has(currentParentId)) {
			return true;
		}
		currentParentId = nodeTypeById.get(currentParentId)?.parentId;
	}

	return false;
}

function nodeTypeHasDisabledAncestor(
	nodeType: string,
	disabledNodeTypes: ReadonlySet<string>,
	nodeTypeById: ReadonlyMap<string, IGraphNodeTypeDefinition>,
): boolean {
	return hasDisabledAncestor(
		nodeTypeById.get(nodeType)?.parentId,
		disabledNodeTypes,
		nodeTypeById,
	);
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
	nodeTypes: readonly IGraphNodeTypeDefinition[] = CORE_GRAPH_NODE_TYPES,
): boolean {
	const nodeTypeById = new Map(nodeTypes.map(definition => [definition.id, definition]));
	const scopedSymbolDefinition = getScopedSymbolVisibility(node, scopedSymbolDefinitions);
	if (
		scopedSymbolDefinition?.definition.parentId
		&& hasDisabledAncestor(
			scopedSymbolDefinition.definition.parentId,
			disabledNodeTypes,
			nodeTypeById,
		)
	) {
		return false;
	}

	const nodeType = getNodeType(node);
	if (
		disabledNodeTypes.has(nodeType)
		|| nodeTypeHasDisabledAncestor(nodeType, disabledNodeTypes, nodeTypeById)
	) {
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
