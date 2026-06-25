import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import type { IProjectedConnection } from '../../../analysis/projectedConnection';

export function serializeWorkspaceIndexGraphAnalysis(analysis: IFileAnalysisResult): string {
  return JSON.stringify({
    edgeTypes: listOrEmpty(analysis.edgeTypes),
    filePath: analysis.filePath,
    nodeTypes: listOrEmpty(analysis.nodeTypes),
    nodes: listOrEmpty(analysis.nodes),
    relations: listOrEmpty(analysis.relations),
    symbols: listOrEmpty(analysis.symbols),
  });
}

export function serializeWorkspaceIndexConnections(
  connections: IProjectedConnection[] | undefined,
): string {
  return JSON.stringify(connections ?? []);
}

function listOrEmpty<T>(value: readonly T[] | undefined): readonly T[] {
  return value ?? [];
}
