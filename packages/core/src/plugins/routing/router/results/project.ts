import type { IFileAnalysisResult, IPlugin } from '@codegraphy-dev/plugin-api';
import type { IProjectedConnection } from '../../../../analysis/projectedConnection';

export function withPluginProvenance(
  plugin: IPlugin,
  result: IFileAnalysisResult,
): IFileAnalysisResult {
  return {
    ...result,
    relations: result.relations?.map((relation) => ({
      ...relation,
      pluginId: relation.pluginId ?? plugin.id,
    })),
  };
}

export function toProjectedConnectionsFromFileAnalysis(analysis: IFileAnalysisResult): IProjectedConnection[] {
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
