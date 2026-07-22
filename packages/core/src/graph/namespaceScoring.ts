import type { IAnalysisSymbol, IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import path from 'node:path';

function countIncomingIncludes(
  filePath: string,
  fileAnalysis: ReadonlyMap<string, IFileAnalysisResult>,
): number {
  let count = 0;
  for (const analysis of fileAnalysis.values()) {
    for (const relation of analysis.relations ?? []) {
      if (relation.kind === 'include' && (relation.toFilePath ?? relation.resolvedPath) === filePath) {
        count += 1;
      }
    }
  }
  return count;
}

function scoreNamespaceSymbol(
  symbol: IAnalysisSymbol,
  fileAnalysis: ReadonlyMap<string, IFileAnalysisResult>,
): number {
  const header = ['.h', '.hh', '.hpp', '.hxx'].includes(path.extname(symbol.filePath));
  return (header ? 10_000 : 0) + countIncomingIncludes(symbol.filePath, fileAnalysis);
}

export function selectCanonicalNamespaceSymbol(
  symbols: readonly IAnalysisSymbol[],
  fileAnalysis: ReadonlyMap<string, IFileAnalysisResult>,
): IAnalysisSymbol {
  return [...symbols].sort((left, right) => (
    scoreNamespaceSymbol(right, fileAnalysis) - scoreNamespaceSymbol(left, fileAnalysis)
    || left.filePath.length - right.filePath.length
    || left.filePath.localeCompare(right.filePath)
  ))[0];
}
