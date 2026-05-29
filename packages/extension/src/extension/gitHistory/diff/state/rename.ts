import * as path from 'path';
import { getFileColor } from '../../../../shared/fileColors';
import type { IGraphEdge, IGraphNode } from '../../../../shared/graph/contracts';
import { replaceGraphEdgeIdEndpoints } from '../../../../shared/graph/edgeIdentity';
import { mergeGitHistoryEdgeSources } from './sources';

export function renameGitHistoryGraphFile(
  oldPath: string,
  newPath: string,
  edges: IGraphEdge[],
  nodeMap: Map<string, IGraphNode>,
  edgeSet: Set<string>,
): void {
  const node = nodeMap.get(oldPath);
  if (node) {
    node.id = newPath;
    node.label = path.basename(newPath);
    node.color = getFileColor(path.extname(newPath));
    nodeMap.delete(oldPath);
    nodeMap.set(newPath, node);
  }

  for (let index = edges.length - 1; index >= 0; index--) {
    const edge = edges[index];
    let changed = false;
    const previousId = edge.id;

    if (edge.from === oldPath) {
      edge.from = newPath;
      changed = true;
    }

    if (edge.to === oldPath) {
      edge.to = newPath;
      changed = true;
    }

    if (!changed) {
      continue;
    }

    edgeSet.delete(previousId);
    const nextId = replaceGraphEdgeIdEndpoints(edge, edge.from, edge.to);
    const duplicateIndex = edges.findIndex((candidate, candidateIndex) => {
      return candidateIndex !== index && candidate.id === nextId;
    });

    if (duplicateIndex >= 0) {
      mergeGitHistoryEdgeSources(edges[duplicateIndex], edge);
      edges.splice(index, 1);
      continue;
    }

    edge.id = nextId;
    edgeSet.add(edge.id);
  }
}
