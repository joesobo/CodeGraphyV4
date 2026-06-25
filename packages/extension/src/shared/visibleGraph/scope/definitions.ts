import type { IGraphNodeTypeDefinition } from '../../graphControls/contracts';
import type { VisibleGraphScopeConfig } from '../contracts';
import { CORE_GRAPH_NODE_TYPES } from '../../graphControls/defaults/definitions';
import { createGlobMatcher } from '../../globMatch';

export interface ScopedSymbolDefinition {
	definition: IGraphNodeTypeDefinition;
	enabled: boolean;
	specificity: number;
	symbolFilePathMatches?: (value: string) => boolean;
}

export function getDefinitionSymbolKinds(
	definition: IGraphNodeTypeDefinition,
): readonly string[] | undefined {
	if (definition.matchSymbolKinds) {
		return definition.matchSymbolKinds;
	}

	if (definition.id.startsWith('symbol:')) {
		return [definition.id.slice('symbol:'.length)];
	}

	return undefined;
}

function getDefinitionSpecificity(definition: IGraphNodeTypeDefinition): number {
	const symbolKinds = getDefinitionSymbolKinds(definition);
	const symbolKindSpecificity = symbolKinds ? 1 / symbolKinds.length : 0;

	return [
		definition.matchSymbolPluginKind,
		definition.matchSymbolSource,
		definition.matchSymbolLanguage,
		definition.matchSymbolFilePath,
	].filter(Boolean).length + symbolKindSpecificity;
}

function hasSymbolMatcher(definition: IGraphNodeTypeDefinition): boolean {
	return getDefinitionSpecificity(definition) > 0;
}

export function getScopedSymbolDefinitions(
	scope: VisibleGraphScopeConfig,
): ScopedSymbolDefinition[] {
	const nodeVisibility = new Map(scope.nodes.map((item) => [item.type, item.enabled]));

	return CORE_GRAPH_NODE_TYPES
		.filter((definition) => definition.parentId && hasSymbolMatcher(definition) && nodeVisibility.has(definition.id))
		.map((definition) => ({
			definition,
			enabled: nodeVisibility.get(definition.id) ?? definition.defaultVisible,
			specificity: getDefinitionSpecificity(definition),
			...(definition.matchSymbolFilePath
				? { symbolFilePathMatches: createGlobMatcher(definition.matchSymbolFilePath) }
				: {}),
		}))
		.sort((left, right) => right.specificity - left.specificity);
}
