import type {
  IFileAnalysisResult,
} from '@codegraphy-dev/plugin-api';
import { createSymbolsByFilePath } from './symbols';
import { enrichRelationTargetSymbol } from './targetSymbol';

export function enrichWorkspaceFileAnalysis(
  fileAnalysis: ReadonlyMap<string, IFileAnalysisResult>,
  workspaceRoot: string,
): Map<string, IFileAnalysisResult> {
  const symbolsByFilePath = createSymbolsByFilePath(fileAnalysis);

  return new Map(
    Array.from(fileAnalysis.entries()).map(([filePath, analysis]) => [
      filePath,
      {
        ...analysis,
        relations: (analysis.relations ?? []).map((relation) =>
          enrichRelationTargetSymbol(relation, symbolsByFilePath, workspaceRoot),
        ),
      },
    ]),
  );
}
