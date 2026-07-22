import type { ExtensionGraphViewContributionSet } from '@codegraphy-dev/extension-plugin-api';
import type { IGraphData, IGraphEdge, IGraphNode } from '../../../../shared/graph/contracts';

function appendUniqueNodes(
  target: IGraphNode[],
  nodeIds: Set<string>,
  nodes: readonly IGraphNode[],
): void {
  for (const node of nodes) {
    if (nodeIds.has(node.id)) {
      continue;
    }

    target.push(node);
    nodeIds.add(node.id);
  }
}

function appendUniqueEdges(
  target: IGraphEdge[],
  edgeIds: Set<string>,
  nodeIds: ReadonlySet<string>,
  edges: readonly IGraphEdge[],
): void {
  for (const edge of edges) {
    if (edgeIds.has(edge.id) || !nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
      continue;
    }

    target.push(edge);
    edgeIds.add(edge.id);
  }
}

export function applyGraphViewRuntimeContributions(
  data: IGraphData,
  contributions: ExtensionGraphViewContributionSet | undefined,
): IGraphData {
  if (!contributions) {
    return data;
  }

  const nodes = [...data.nodes];
  const edges = [...data.edges];
  const nodeIds = new Set(nodes.map(node => node.id));
  const edgeIds = new Set(edges.map(edge => edge.id));

  for (const entry of contributions.runtimeNodes) {
    appendUniqueNodes(
      nodes,
      nodeIds,
      entry.contribution.createNodes({ visibleGraph: { nodes, edges } }),
    );
  }

  for (const entry of contributions.runtimeEdges) {
    appendUniqueEdges(
      edges,
      edgeIds,
      nodeIds,
      entry.contribution.createEdges({ visibleGraph: { nodes, edges } }),
    );
  }

  return { nodes, edges };
}

export function applyGraphViewProjectionContributions(
  data: IGraphData,
  contributions: ExtensionGraphViewContributionSet | undefined,
): IGraphData {
  if (!contributions) {
    return data;
  }

  return contributions.projections.reduce<IGraphData>(
    (
      visibleGraph: IGraphData,
      entry: ExtensionGraphViewContributionSet['projections'][number],
    ) => entry.contribution.project({ visibleGraph }),
    data,
  );
}
