import type { IGraphData } from '../graph/contracts';
import type { IGraphNodeTypeDefinition } from '../graphControls/contracts';
import { globMatch } from '../globMatch';

function optionalIncludes<T>(allowedValues: readonly T[] | undefined, value: T): boolean {
  return allowedValues ? allowedValues.includes(value) : true;
}

function optionalEquals<T>(expected: T | undefined, value: T | undefined): boolean {
  return expected === undefined || expected === value;
}

function optionalGlobMatches(pattern: string | undefined, value: string): boolean {
  return pattern === undefined || globMatch(value, pattern);
}

export function symbolMatchesScopedDefinition(
  node: IGraphData['nodes'][number],
  definition: IGraphNodeTypeDefinition,
): boolean {
  const symbol = node.symbol;
  if (!symbol) {
    return false;
  }

  return [
    optionalIncludes(definition.matchSymbolKinds, symbol.kind),
    optionalEquals(definition.matchSymbolPluginKind, symbol.pluginKind),
    optionalEquals(definition.matchSymbolSource, symbol.source),
    optionalEquals(definition.matchSymbolLanguage, symbol.language),
    optionalGlobMatches(definition.matchSymbolFilePath, symbol.filePath),
  ].every(Boolean);
}
