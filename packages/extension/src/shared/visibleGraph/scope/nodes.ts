import type { IGraphData } from '../../graph/contracts';
import { getNodeType } from '../model';
import type { ScopedSymbolDefinition } from './definitions';
import { symbolMatchesScopedDefinition } from './symbolMatch';

function getScopedSymbolVisibility(
	node: IGraphData['nodes'][number],
	scopedSymbolDefinitions: readonly ScopedSymbolDefinition[],
): ScopedSymbolDefinition | undefined {
	const matchingDefinition = scopedSymbolDefinitions.find((item) => (
		symbolMatchesScopedDefinition(node, item.definition)
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
		&& disabledNodeTypes.has(scopedSymbolDefinition.definition.parentId)
	) {
		return false;
	}

	if (disabledNodeTypes.has(getNodeType(node))) {
		return false;
	}

	if (scopedSymbolDefinition) {
		return scopedSymbolDefinition.enabled;
	}

	return true;
}
