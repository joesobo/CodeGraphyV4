import type {
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '@codegraphy/plugin-api';

export function createSymbolsByFilePath(
  fileAnalysis: ReadonlyMap<string, IFileAnalysisResult>,
): Map<string, IAnalysisSymbol[]> {
  const symbolsByFilePath = new Map<string, IAnalysisSymbol[]>();

  for (const analysis of fileAnalysis.values()) {
    if (analysis.symbols) {
      symbolsByFilePath.set(analysis.filePath, analysis.symbols);
    }
  }

  return symbolsByFilePath;
}
