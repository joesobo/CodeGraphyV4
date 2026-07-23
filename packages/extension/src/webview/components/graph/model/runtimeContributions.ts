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

function reportContributionFailure(
  kind: string,
  pluginId: string,
  contributionId: string,
  error: unknown,
): void {
  console.error(
    `[CodeGraphy] ${kind} contribution '${contributionId}' from plugin '${pluginId}' failed:`,
    error,
  );
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
    try {
      appendUniqueNodes(
        nodes,
        nodeIds,
        entry.contribution.createNodes({ visibleGraph: { nodes, edges } }),
      );
    } catch (error) {
      reportContributionFailure(
        'Runtime node', entry.pluginId, entry.contribution.id, error,
      );
    }
  }

  for (const entry of contributions.runtimeEdges) {
    try {
      appendUniqueEdges(
        edges,
        edgeIds,
        nodeIds,
        entry.contribution.createEdges({ visibleGraph: { nodes, edges } }),
      );
    } catch (error) {
      reportContributionFailure(
        'Runtime edge', entry.pluginId, entry.contribution.id, error,
      );
    }
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

  let visibleGraph = data;
  for (const entry of contributions.projections) {
    try {
      visibleGraph = entry.contribution.project({ visibleGraph });
    } catch (error) {
      reportContributionFailure(
        'Projection', entry.pluginId, entry.contribution.id, error,
      );
    }
  }
  return visibleGraph;
}
