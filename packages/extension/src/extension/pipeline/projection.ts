import type { IConnection, IFileAnalysisResult } from '../../core/plugins/types/contracts';

export function projectConnectionsFromFileAnalysis(
  analysis: IFileAnalysisResult,
): IConnection[] {
  return (analysis.relations ?? []).map(relation => ({
    kind: relation.kind,
    sourceId: relation.sourceId,
    specifier: relation.specifier ?? '',
    resolvedPath: relation.resolvedPath ?? relation.toFilePath ?? null,
    type: relation.type,
    variant: relation.variant,
    metadata: relation.metadata,
  }));
}
