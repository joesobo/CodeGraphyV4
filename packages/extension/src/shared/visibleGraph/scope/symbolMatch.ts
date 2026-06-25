import type { IGraphData } from '../../graph/contracts';
import type { IGraphNodeTypeDefinition } from '../../graphControls/contracts';
import { globMatch } from '../../globMatch';
import type { ScopedSymbolDefinition } from './definitions';
import { getDefinitionSymbolKinds } from './definitions';

type ScopedSymbolMatcher = IGraphNodeTypeDefinition | ScopedSymbolDefinition;
type GraphNode = IGraphData['nodes'][number];
type GraphNodeSymbol = NonNullable<GraphNode['symbol']>;
type ScopedSymbolConstraintMatcher = (
  symbol: GraphNodeSymbol,
  scopedDefinition: ScopedSymbolMatcher,
  definition: IGraphNodeTypeDefinition,
) => boolean;

function isCompiledScopedSymbolDefinition(
	definition: ScopedSymbolMatcher,
): definition is ScopedSymbolDefinition {
	return 'definition' in definition;
}

function getMatcherDefinition(definition: ScopedSymbolMatcher): IGraphNodeTypeDefinition {
	return isCompiledScopedSymbolDefinition(definition) ? definition.definition : definition;
}

export function symbolMatchesScopedDefinition(
	node: GraphNode,
	scopedDefinition: ScopedSymbolMatcher,
): boolean {
	const symbol = node.symbol;
	if (!symbol) {
		return false;
	}

	const definition = getMatcherDefinition(scopedDefinition);
	return SCOPED_SYMBOL_CONSTRAINT_MATCHERS.every(matcher =>
		matcher(symbol, scopedDefinition, definition),
	);
}

function optionalValueMatches<T>(expected: T | undefined, actual: T | undefined): boolean {
	return expected === undefined || expected === actual;
}

function symbolKindMatchesDefinition(symbol: GraphNodeSymbol, definition: IGraphNodeTypeDefinition): boolean {
	const definitionSymbolKinds = getDefinitionSymbolKinds(definition);
	return definitionSymbolKinds === undefined || definitionSymbolKinds.includes(symbol.kind);
}

function symbolFilePathMatchesDefinition(
	symbol: GraphNodeSymbol,
	scopedDefinition: ScopedSymbolMatcher,
	definition: IGraphNodeTypeDefinition,
): boolean {
	if (!definition.matchSymbolFilePath) {
		return true;
	}

	if (isCompiledScopedSymbolDefinition(scopedDefinition) && scopedDefinition.symbolFilePathMatches) {
		return scopedDefinition.symbolFilePathMatches(symbol.filePath);
	}

	return globMatch(symbol.filePath, definition.matchSymbolFilePath);
}

const SCOPED_SYMBOL_CONSTRAINT_MATCHERS: readonly ScopedSymbolConstraintMatcher[] = [
	(symbol, _scopedDefinition, definition) => symbolKindMatchesDefinition(symbol, definition),
	(symbol, _scopedDefinition, definition) => optionalValueMatches(definition.matchSymbolPluginKind, symbol.pluginKind),
	(symbol, _scopedDefinition, definition) => optionalValueMatches(definition.matchSymbolSource, symbol.source),
	(symbol, _scopedDefinition, definition) => optionalValueMatches(definition.matchSymbolLanguage, symbol.language),
	symbolFilePathMatchesDefinition,
];
