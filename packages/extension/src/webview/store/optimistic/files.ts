import type { IGraphData, IGraphEdge, IGraphNode } from '../../../shared/graph/contracts';

export type OptimisticFileMutation =
  | { kind: 'create'; node: IGraphNode }
  | { kind: 'delete'; paths: readonly string[] }
  | { kind: 'rename'; oldPath: string; newPath: string };

export interface OptimisticFileMutationResult {
  graphData: IGraphData;
  previousGraphData: IGraphData;
}

export function applyOptimisticFileMutation(
  graphData: IGraphData,
  mutation: OptimisticFileMutation,
): OptimisticFileMutationResult {
  const previousGraphData = graphData;
  if (mutation.kind === 'create') {
    return {
      previousGraphData,
      graphData: graphData.nodes.some(node => node.id === mutation.node.id)
        ? graphData
        : { ...graphData, nodes: [...graphData.nodes, mutation.node] },
    };
  }
  if (mutation.kind === 'delete') {
    const isDeleted = (path: string): boolean => mutation.paths.some(
      deletedPath => path === deletedPath || path.startsWith(`${deletedPath}/`),
    );
    return {
      previousGraphData,
      graphData: {
        ...graphData,
        nodes: graphData.nodes.filter(node => !isDeleted(node.id)),
        edges: graphData.edges.filter(edge => !isDeleted(edge.from) && !isDeleted(edge.to)),
      },
    };
  }

  const rename = (path: string): string => renamePathPrefix(
    path,
    mutation.oldPath,
    mutation.newPath,
  );
  return {
    previousGraphData,
    graphData: {
      ...graphData,
      nodes: graphData.nodes.map(node => renameNode(node, rename)),
      edges: graphData.edges.map(edge => renameEdge(edge, rename)),
    },
  };
}

function renamePathPrefix(path: string, oldPath: string, newPath: string): string {
  if (path === oldPath) return newPath;
  return path.startsWith(`${oldPath}/`)
    ? `${newPath}${path.slice(oldPath.length)}`
    : path;
}

function renameNode(node: IGraphNode, rename: (path: string) => string): IGraphNode {
  const id = rename(node.id);
  return id === node.id
    ? node
    : { ...node, id, label: id.split('/').pop() ?? id };
}

function renameEdge(edge: IGraphEdge, rename: (path: string) => string): IGraphEdge {
  const from = rename(edge.from);
  const to = rename(edge.to);
  if (from === edge.from && to === edge.to) return edge;
  return {
    ...edge,
    from,
    to,
    id: `${from}->${to}#${edge.kind}`,
  };
}
