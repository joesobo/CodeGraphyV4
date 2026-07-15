import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';

export function collectExplicitlyContainedSymbolIds(
  fileAnalysis: ReadonlyMap<string, IFileAnalysisResult>,
): Set<string> {
  const symbolIds = new Set<string>();
  for (const analysis of fileAnalysis.values()) {
    for (const relation of analysis.relations ?? []) {
      if (relation.kind === 'contains' && relation.toSymbolId) {
        symbolIds.add(relation.toSymbolId);
      }
    }
  }
  return symbolIds;
}
