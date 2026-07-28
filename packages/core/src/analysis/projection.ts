import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import type { IProjectedConnection } from './projectedConnection';

type AnalysisRelation = NonNullable<IFileAnalysisResult['relations']>[number];

export function isDirectSameFileSymbolRelation(relation: AnalysisRelation): boolean {
  const targetPath = relation.resolvedPath ?? relation.toFilePath ?? null;
  return relation.kind !== 'contains'
    && Boolean(relation.fromSymbolId && relation.toSymbolId)
    && Boolean(targetPath)
    && targetPath === relation.fromFilePath
    && relation.metadata?.bindingKind == null;
}

function shouldOmitSameFileSymbolProjection(
  relation: AnalysisRelation,
): boolean {
  const targetPath = relation.resolvedPath ?? relation.toFilePath ?? null;
  const hasSymbolEndpoint = Boolean(relation.fromSymbolId || relation.toSymbolId);
  const isSameFile = Boolean(targetPath) && targetPath === relation.fromFilePath;

  if (!hasSymbolEndpoint || !isSameFile) {
    return false;
  }

  // Only complete, direct symbol relations become file-level self-loops.
  // Partial and binding-derived facts remain available in the symbol graph.
  return !isDirectSameFileSymbolRelation(relation);
}

export function projectProjectedConnectionsFromFileAnalysis(
  analysis: IFileAnalysisResult,
): IProjectedConnection[] {
  return (analysis.relations ?? [])
    .filter(relation => !shouldOmitSameFileSymbolProjection(relation))
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
