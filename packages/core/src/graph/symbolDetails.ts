import type { IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import type { IGraphNode } from './contracts';

export function createSymbolDetails(
  symbol: IAnalysisSymbol,
  id: string,
  kind: string,
  filePath: string,
): NonNullable<IGraphNode['symbol']> {
  const details: NonNullable<IGraphNode['symbol']> = {
    id,
    name: symbol.name,
    kind,
    filePath,
  };

  if (typeof symbol.metadata?.pluginKind === 'string') details.pluginKind = symbol.metadata.pluginKind;
  if (typeof symbol.metadata?.language === 'string') details.language = symbol.metadata.language;
  if (typeof symbol.metadata?.source === 'string') details.source = symbol.metadata.source;
  if (symbol.range) details.range = symbol.range;
  if (symbol.signature) details.signature = symbol.signature;

  return details;
}
