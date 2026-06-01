import { globMatch } from '../../../../../shared/globMatch';
import type { IGraphData } from '../../../../../shared/graph/contracts';
import type { SymbolDefaultGroup } from './model';

export function pluginMetadataMatchesGroup(
  group: SymbolDefaultGroup,
  symbol: NonNullable<IGraphData['nodes'][number]['symbol']>,
): boolean {
  return [
    !group.matchSymbolPluginKind || group.matchSymbolPluginKind === symbol.pluginKind,
    !group.matchSymbolSource || group.matchSymbolSource === symbol.source,
    !group.matchSymbolLanguage || group.matchSymbolLanguage === symbol.language,
    !group.matchSymbolFilePath || globMatch(symbol.filePath, group.matchSymbolFilePath),
  ].every(Boolean);
}
