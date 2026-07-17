import type { IAnalysisRelation, IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import { toRepoRelativeGraphPath } from '../graph/symbolPaths';

function normalizeFactId(value: string | undefined, workspaceRoot: string): string | undefined {
  if (!value) {
    return value;
  }

  const normalizedValue = value.replace(/\\/g, '/');
  const normalizedRoot = workspaceRoot.replace(/\\/g, '/').replace(/\/$/, '');
  return normalizedValue.startsWith(`${normalizedRoot}/`)
    ? normalizedValue.slice(normalizedRoot.length + 1)
    : normalizedValue;
}

function normalizeOptionalPath(
  value: string | null | undefined,
  workspaceRoot: string,
): string | null | undefined {
  return value ? toRepoRelativeGraphPath(value, workspaceRoot) : value;
}

export function normalizeWorkspaceQueryFacts(
  snapshot: {
    symbols: readonly IAnalysisSymbol[];
    relations: readonly IAnalysisRelation[];
  },
  workspaceRoot: string,
): { symbols: IAnalysisSymbol[]; relations: IAnalysisRelation[] } {
  return {
    symbols: snapshot.symbols.map(symbol => ({
      ...symbol,
      id: normalizeFactId(symbol.id, workspaceRoot) ?? symbol.id,
      filePath: toRepoRelativeGraphPath(symbol.filePath, workspaceRoot),
    })),
    relations: snapshot.relations.map(relation => ({
      ...relation,
      fromFilePath: toRepoRelativeGraphPath(relation.fromFilePath, workspaceRoot),
      fromNodeId: normalizeFactId(relation.fromNodeId, workspaceRoot),
      fromSymbolId: normalizeFactId(relation.fromSymbolId, workspaceRoot),
      resolvedPath: normalizeOptionalPath(relation.resolvedPath, workspaceRoot),
      toFilePath: normalizeOptionalPath(relation.toFilePath, workspaceRoot),
      toNodeId: normalizeFactId(relation.toNodeId, workspaceRoot),
      toSymbolId: normalizeFactId(relation.toSymbolId, workspaceRoot),
    })),
  };
}
