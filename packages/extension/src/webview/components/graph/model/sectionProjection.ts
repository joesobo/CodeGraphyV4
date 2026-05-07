import type { IGraphData, IGraphEdge, IGraphNode } from '../../../../shared/graph/contracts';
import type { GraphLayoutMode, GraphLayoutSettings } from '../../../../shared/settings/graphLayout';
import {
  getGraphLayoutCollapsedRepresentative,
  isGraphLayoutItemHiddenByCollapsedSection,
} from '../../../../shared/settings/graphLayout';

export interface ProjectedGraphEdge extends IGraphEdge {
  projectedEdgeCount?: number;
  projectedEdgeIds?: string[];
}

export interface ProjectGraphSectionsResult {
  data: {
    edges: ProjectedGraphEdge[];
    nodes: IGraphNode[];
  };
}

function shouldProjectGraphSections(
  graphLayout: GraphLayoutSettings | undefined,
  graphMode: GraphLayoutMode,
  timelineActive: boolean,
): graphLayout is GraphLayoutSettings {
  return !!graphLayout
    && graphMode === '2d'
    && !timelineActive
    && Object.keys(graphLayout.sections).some(sectionId => graphLayout.sections[sectionId].collapsed);
}

function getVisibleNodeId(
  graphLayout: GraphLayoutSettings,
  itemId: string,
): string {
  return getGraphLayoutCollapsedRepresentative(graphLayout, itemId) ?? itemId;
}

function projectGraphNodes(
  nodes: readonly IGraphNode[],
  graphLayout: GraphLayoutSettings,
): IGraphNode[] {
  return nodes.filter(node => !isGraphLayoutItemHiddenByCollapsedSection(graphLayout, node.id));
}

function getProjectedEdgeKey(
  from: string,
  to: string,
  edge: Pick<IGraphEdge, 'kind'>,
): string {
  return `${from}->${to}#${edge.kind}`;
}

function createProjectedEdge(
  edge: IGraphEdge,
  from: string,
  to: string,
): ProjectedGraphEdge {
  return {
    ...edge,
    from,
    id: getProjectedEdgeKey(from, to, edge),
    projectedEdgeCount: 1,
    projectedEdgeIds: [edge.id],
    to,
  };
}

function mergeProjectedEdge(
  existing: ProjectedGraphEdge,
  edge: IGraphEdge,
): ProjectedGraphEdge {
  return {
    ...existing,
    projectedEdgeCount: (existing.projectedEdgeCount ?? 1) + 1,
    projectedEdgeIds: [...(existing.projectedEdgeIds ?? [existing.id]), edge.id],
    sources: [...existing.sources, ...edge.sources],
  };
}

function projectGraphEdges(
  edges: readonly IGraphEdge[],
  graphLayout: GraphLayoutSettings,
): ProjectedGraphEdge[] {
  const projectedEdges = new Map<string, ProjectedGraphEdge>();

  for (const edge of edges) {
    const from = getVisibleNodeId(graphLayout, edge.from);
    const to = getVisibleNodeId(graphLayout, edge.to);
    if (from === to) {
      continue;
    }

    const key = getProjectedEdgeKey(from, to, edge);
    const existing = projectedEdges.get(key);
    projectedEdges.set(
      key,
      existing ? mergeProjectedEdge(existing, edge) : createProjectedEdge(edge, from, to),
    );
  }

  return [...projectedEdges.values()];
}

export function projectGraphSectionsForRendering({
  data,
  graphLayout,
  graphMode = '2d',
  timelineActive,
}: {
  data: IGraphData;
  graphLayout?: GraphLayoutSettings;
  graphMode?: GraphLayoutMode;
  timelineActive: boolean;
}): ProjectGraphSectionsResult {
  if (!shouldProjectGraphSections(graphLayout, graphMode, timelineActive)) {
    return { data };
  }

  return {
    data: {
      edges: projectGraphEdges(data.edges, graphLayout),
      nodes: projectGraphNodes(data.nodes, graphLayout),
    },
  };
}
