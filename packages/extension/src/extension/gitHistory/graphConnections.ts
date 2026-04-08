import * as path from 'path';
import type { IConnection } from '../../core/plugins/types/contracts';
import type { IGraphEdge } from '../../shared/graph/types';

export interface AppendGitHistoryConnectionEdgesOptions {
  connections: readonly IConnection[];
  edgeSet: Set<string>;
  edges: IGraphEdge[];
  plugin?: { id: string };
  sourcePath: string;
  workspaceRoot: string;
}

export function appendGitHistoryConnectionEdges(
  options: AppendGitHistoryConnectionEdgesOptions,
): void {
  const {
    connections,
    edgeSet,
    edges,
    plugin,
    sourcePath,
    workspaceRoot,
  } = options;

  for (const connection of connections) {
    if (!connection.resolvedPath) {
      continue;
    }

    const targetRelative = path.relative(workspaceRoot, connection.resolvedPath);
    const edgeId = `${sourcePath}->${targetRelative}#${connection.kind}`;
    if (edgeSet.has(edgeId)) {
      continue;
    }

    const pluginId = connection.pluginId ?? plugin?.id;

    const edge: IGraphEdge = {
      id: edgeId,
      from: sourcePath,
      to: targetRelative,
      kind: connection.kind,
      sources: pluginId ? [{
        id: `${pluginId}:${connection.sourceId}`,
        pluginId,
        sourceId: connection.sourceId,
        label: connection.sourceId,
        metadata: connection.metadata,
        variant: connection.variant,
      }] : [],
    };

    edgeSet.add(edgeId);
    edges.push(edge);
  }
}
