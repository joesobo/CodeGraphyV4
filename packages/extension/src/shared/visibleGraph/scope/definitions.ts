import type { IGraphNodeTypeDefinition } from '../../graphControls/contracts';
import type { VisibleGraphScopeConfig } from '../contracts';
import { CORE_GRAPH_NODE_TYPES } from '../../graphControls/defaults/definitions';

export interface ScopedSymbolDefinition {
	definition: IGraphNodeTypeDefinition;
	enabled: boolean;
	specificity: number;
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
	return [
		getDefinitionSymbolKinds(definition),
		definition.matchSymbolPluginKind,
		definition.matchSymbolSource,
		definition.matchSymbolLanguage,
		definition.matchSymbolFilePath,
	].filter(Boolean).length;
}

export function getScopedSymbolDefinitions(
	scope: VisibleGraphScopeConfig,
): ScopedSymbolDefinition[] {
	const nodeVisibility = new Map(scope.nodes.map((item) => [item.type, item.enabled]));

	return CORE_GRAPH_NODE_TYPES
		.filter((definition) => definition.parentId && nodeVisibility.has(definition.id))
		.map((definition) => ({
			definition,
			enabled: nodeVisibility.get(definition.id) ?? definition.defaultVisible,
			specificity: getDefinitionSpecificity(definition),
		}))
		.sort((left, right) => right.specificity - left.specificity);
}
