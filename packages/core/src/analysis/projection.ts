import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import type { IProjectedConnection } from './projectedConnection';

function isSameFileSymbolRelation(
  relation: NonNullable<IFileAnalysisResult['relations']>[number],
): boolean {
  const targetPath = relation.resolvedPath ?? relation.toFilePath ?? null;
  return Boolean(relation.fromSymbolId || relation.toSymbolId)
    && Boolean(targetPath)
    && targetPath === relation.fromFilePath;
}

export function projectProjectedConnectionsFromFileAnalysis(
  analysis: IFileAnalysisResult,
): IProjectedConnection[] {
  return (analysis.relations ?? [])
    .filter(relation => !isSameFileSymbolRelation(relation))
    .map(relation => ({
      kind: relation.kind,
      pluginId: relation.pluginId,
      sourceId: relation.sourceId,
      specifier: relation.specifier ?? '',
      resolvedPath: relation.resolvedPath ?? relation.toFilePath ?? null,
      type: relation.type,
      variant: relation.variant,
      metadata: relation.metadata,
    }));
}

export function projectConnectionMapFromFileAnalysis(
  fileAnalysis: ReadonlyMap<string, IFileAnalysisResult>,
): Map<string, IProjectedConnection[]> {
  return new Map(
    Array.from(fileAnalysis.entries()).map(([filePath, analysis]) => [
      filePath,
      projectProjectedConnectionsFromFileAnalysis(analysis),
    ]),
  );
}
