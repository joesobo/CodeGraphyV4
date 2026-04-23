import * as path from 'path';
import { getFileColor } from '../../../shared/fileColors';
import type { IGraphEdge, IGraphNode } from '../../../shared/graph/contracts';
import { replaceGraphEdgeIdEndpoints } from '../../../shared/graph/edgeIdentity';

export function deleteGitHistoryGraphFile(
  filePath: string,
  nodes: IGraphNode[],
  edges: IGraphEdge[],
  nodeMap: Map<string, IGraphNode>,
  edgeSet: Set<string>,
): void {
  const nodeIndex = nodes.findIndex((node) => node.id === filePath);
  if (nodeIndex !== -1) {
    nodes.splice(nodeIndex, 1);
  }

  nodeMap.delete(filePath);

  const edgeIndexesToRemove: number[] = [];
  for (let index = edges.length - 1; index >= 0; index--) {
    if (edges[index].from !== filePath && edges[index].to !== filePath) {
      continue;
    }

    edgeSet.delete(edges[index].id);
    edgeIndexesToRemove.push(index);
  }

  for (const index of edgeIndexesToRemove) {
    edges.splice(index, 1);
  }
}

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

function mergeGitHistoryEdgeSources(targetEdge: IGraphEdge, sourceEdge: IGraphEdge): void {
  const mergedSources = [...targetEdge.sources];
  const seenSourceIds = new Set(mergedSources.map((source) => source.id));

  for (const source of sourceEdge.sources) {
    if (seenSourceIds.has(source.id)) {
      continue;
    }

    seenSourceIds.add(source.id);
    mergedSources.push(source);
  }

  targetEdge.sources = mergedSources;
}
