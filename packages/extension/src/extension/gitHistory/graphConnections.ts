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
    const edgeId = `${sourcePath}->${targetRelative}`;
    if (edgeSet.has(edgeId)) {
      continue;
    }

    const edge: IGraphEdge = {
      id: edgeId,
      from: sourcePath,
      to: targetRelative,
    };

    if (connection.ruleId) {
      edge.ruleId = connection.ruleId;
      if (plugin) {
        edge.ruleIds = [`${plugin.id}:${connection.ruleId}`];
      }
    }

    edgeSet.add(edgeId);
    edges.push(edge);
  }
}
