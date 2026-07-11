import type { IFileAnalysisResult, IPlugin } from '@codegraphy-dev/plugin-api';
import type { IProjectedConnection } from '../../../../analysis/projectedConnection';

function withSymbolPluginProvenance(
  symbol: NonNullable<IFileAnalysisResult['symbols']>[number],
  plugin: IPlugin,
): NonNullable<IFileAnalysisResult['symbols']>[number] {
  return {
    ...symbol,
    metadata: {
      ...symbol.metadata,
      pluginId: symbol.metadata?.pluginId ?? plugin.id,
      source: symbol.metadata?.source ?? plugin.id,
    },
  };
}

function withNodePluginProvenance(
  node: NonNullable<IFileAnalysisResult['nodes']>[number],
  plugin: IPlugin,
): NonNullable<IFileAnalysisResult['nodes']>[number] {
  return {
    ...node,
    metadata: {
      ...node.metadata,
      pluginId: node.metadata?.pluginId ?? plugin.id,
      source: node.metadata?.source ?? plugin.id,
    },
  };
}

export function withPluginProvenance(
  plugin: IPlugin,
  result: IFileAnalysisResult,
): IFileAnalysisResult {
  return {
    ...result,
    nodes: result.nodes?.map(node => withNodePluginProvenance(node, plugin)),
    relations: result.relations?.map((relation) => ({
      ...relation,
      pluginId: relation.pluginId ?? plugin.id,
    })),
    symbols: result.symbols?.map(symbol => withSymbolPluginProvenance(symbol, plugin)),
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
