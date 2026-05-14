import type { IAnalysisSymbol, IFileAnalysisResult } from '@codegraphy/plugin-api';
import { normalizeSymbolKind, toRepoRelativeGraphPath } from './symbolPaths';

function createBaseCanonicalSymbolId(
  symbol: IAnalysisSymbol,
  workspaceRoot: string,
): string {
  const filePath = toRepoRelativeGraphPath(symbol.filePath, workspaceRoot);
  const kind = normalizeSymbolKind(symbol.kind);
  const signature = symbol.signature ? `:${encodeURIComponent(symbol.signature)}` : '';

  return `${filePath}#${symbol.name}:${kind}${signature}`;
}

export function createCanonicalSymbolIds(
  fileAnalysis: ReadonlyMap<string, IFileAnalysisResult>,
  workspaceRoot: string,
): Map<string, string> {
  const symbolIds = new Map<string, string>();
  const counts = new Map<string, number>();

  for (const analysis of fileAnalysis.values()) {
    for (const symbol of analysis.symbols ?? []) {
      const baseId = createBaseCanonicalSymbolId(symbol, workspaceRoot);
      const occurrence = (counts.get(baseId) ?? 0) + 1;
      counts.set(baseId, occurrence);
      const canonicalId = occurrence === 1 ? baseId : `${baseId}:${occurrence}`;
      symbolIds.set(symbol.id, canonicalId);
      symbolIds.set(canonicalId, canonicalId);
    }
  }

  return symbolIds;
}
