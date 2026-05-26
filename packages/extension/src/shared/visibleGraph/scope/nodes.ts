import type { IGraphData } from '../../graph/contracts';
import { getNodeType } from '../model';
import type { ScopedSymbolDefinition } from './definitions';
import { symbolMatchesScopedDefinition } from './symbolMatch';

function getScopedSymbolVisibility(
	node: IGraphData['nodes'][number],
	scopedSymbolDefinitions: readonly ScopedSymbolDefinition[],
): boolean | undefined {
	const matchingDefinition = scopedSymbolDefinitions.find((item) => (
		symbolMatchesScopedDefinition(node, item.definition)
	));

	return matchingDefinition?.enabled;
}

export function nodeMatchesScope(
	node: IGraphData['nodes'][number],
	disabledNodeTypes: ReadonlySet<string>,
	scopedSymbolDefinitions: readonly ScopedSymbolDefinition[],
): boolean {
	const scopedSymbolVisibility = getScopedSymbolVisibility(node, scopedSymbolDefinitions);
	if (scopedSymbolVisibility !== undefined) {
		return scopedSymbolVisibility;
	}

	if (disabledNodeTypes.has(getNodeType(node))) {
		return false;
	}

	return true;
}
