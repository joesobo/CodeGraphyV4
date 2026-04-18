import type { IProjectedConnection, IFileAnalysisResult } from '../../core/plugins/types/contracts';

export function projectProjectedConnectionsFromFileAnalysis(
  analysis: IFileAnalysisResult,
): IProjectedConnection[] {
  return (analysis.relations ?? []).map(relation => ({
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
