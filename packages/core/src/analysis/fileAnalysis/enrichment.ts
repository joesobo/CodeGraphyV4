import type {
  IFileAnalysisResult,
} from '@codegraphy/plugin-api';
import { createSymbolsByFilePath } from './symbols';
import { enrichRelationTargetSymbol } from './targetSymbol';

export function enrichWorkspaceFileAnalysis(
  fileAnalysis: ReadonlyMap<string, IFileAnalysisResult>,
): Map<string, IFileAnalysisResult> {
  const symbolsByFilePath = createSymbolsByFilePath(fileAnalysis);

  return new Map(
    Array.from(fileAnalysis.entries()).map(([filePath, analysis]) => [
      filePath,
      {
        ...analysis,
        relations: (analysis.relations ?? []).map((relation) =>
          enrichRelationTargetSymbol(relation, symbolsByFilePath),
        ),
      },
    ]),
  );
}
