import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import { selectCanonicalNamespaceSymbol } from './namespaceScoring';

type AnalysisSymbols = NonNullable<IFileAnalysisResult['symbols']>;

export function collectProjectableNamespaceSymbolIds(
  fileAnalysis: ReadonlyMap<string, IFileAnalysisResult>,
): Set<string> {
  const symbolsByName = new Map<string, AnalysisSymbols>();

  for (const analysis of fileAnalysis.values()) {
    for (const symbol of analysis.symbols ?? []) {
      if (symbol.kind === 'namespace') {
        symbolsByName.set(symbol.name, [...(symbolsByName.get(symbol.name) ?? []), symbol]);
      }
    }
  }

  return new Set(Array.from(symbolsByName.values()).map(symbols => (
    symbols.length === 1
      ? symbols[0].id
      : selectCanonicalNamespaceSymbol(symbols, fileAnalysis).id
  )));
}
