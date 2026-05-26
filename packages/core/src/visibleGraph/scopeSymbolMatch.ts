import type { IGraphData } from '../graph/contracts';
import type { IGraphNodeTypeDefinition } from '../graphControls/contracts';
import { globMatch } from '../globMatch';

export function symbolMatchesScopedDefinition(
  node: IGraphData['nodes'][number],
  definition: IGraphNodeTypeDefinition,
): boolean {
  const symbol = node.symbol;
  if (!symbol) {
    return false;
  }

  const symbolKindMatches = !definition.matchSymbolKinds || definition.matchSymbolKinds.includes(symbol.kind);
  const pluginKindMatches = !definition.matchSymbolPluginKind || definition.matchSymbolPluginKind === symbol.pluginKind;
  const sourceMatches = !definition.matchSymbolSource || definition.matchSymbolSource === symbol.source;
  const languageMatches = !definition.matchSymbolLanguage || definition.matchSymbolLanguage === symbol.language;
  const filePathMatches = !definition.matchSymbolFilePath || globMatch(symbol.filePath, definition.matchSymbolFilePath);

  return symbolKindMatches && pluginKindMatches && sourceMatches && languageMatches && filePathMatches;
}
