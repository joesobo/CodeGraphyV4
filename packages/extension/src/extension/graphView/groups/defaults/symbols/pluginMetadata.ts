import { globMatch } from '../../../../../shared/globMatch';
import type { IGraphData } from '../../../../../shared/graph/contracts';
import type { SymbolDefaultGroup } from './model';

export function pluginMetadataMatchesGroup(
  group: SymbolDefaultGroup,
  symbol: NonNullable<IGraphData['nodes'][number]['symbol']>,
): boolean {
  if (group.matchSymbolPluginKind && group.matchSymbolPluginKind !== symbol.pluginKind) {
    return false;
  }
  if (group.matchSymbolSource && group.matchSymbolSource !== symbol.source) {
    return false;
  }
  if (group.matchSymbolLanguage && group.matchSymbolLanguage !== symbol.language) {
    return false;
  }
  if (group.matchSymbolFilePath && !globMatch(symbol.filePath, group.matchSymbolFilePath)) {
    return false;
  }

  return true;
}
