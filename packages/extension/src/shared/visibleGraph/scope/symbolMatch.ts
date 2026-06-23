import type { IGraphData } from '../../graph/contracts';
import type { IGraphNodeTypeDefinition } from '../../graphControls/contracts';
import { globMatch } from '../../globMatch';
import type { ScopedSymbolDefinition } from './definitions';
import { getDefinitionSymbolKinds } from './definitions';

type ScopedSymbolMatcher = IGraphNodeTypeDefinition | ScopedSymbolDefinition;

function isCompiledScopedSymbolDefinition(
	definition: ScopedSymbolMatcher,
): definition is ScopedSymbolDefinition {
	return 'definition' in definition;
}

function getMatcherDefinition(definition: ScopedSymbolMatcher): IGraphNodeTypeDefinition {
	return isCompiledScopedSymbolDefinition(definition) ? definition.definition : definition;
}

export function symbolMatchesScopedDefinition(
	node: IGraphData['nodes'][number],
	scopedDefinition: ScopedSymbolMatcher,
): boolean {
	const symbol = node.symbol;
	if (!symbol) {
		return false;
	}

	const definition = getMatcherDefinition(scopedDefinition);
	const definitionSymbolKinds = getDefinitionSymbolKinds(definition);
	if (definitionSymbolKinds && !definitionSymbolKinds.includes(symbol.kind)) {
		return false;
	}

	if (definition.matchSymbolPluginKind && definition.matchSymbolPluginKind !== symbol.pluginKind) {
		return false;
	}

	if (definition.matchSymbolSource && definition.matchSymbolSource !== symbol.source) {
		return false;
	}

	if (definition.matchSymbolLanguage && definition.matchSymbolLanguage !== symbol.language) {
		return false;
	}

	if (!definition.matchSymbolFilePath) {
		return true;
	}

	if (isCompiledScopedSymbolDefinition(scopedDefinition) && scopedDefinition.symbolFilePathMatches) {
		return scopedDefinition.symbolFilePathMatches(symbol.filePath);
	}

	return globMatch(symbol.filePath, definition.matchSymbolFilePath);
}
