import type { CoreGraphViewContributionSet } from '@codegraphy/core';
import type {
  GraphEdgeKind,
  IGraphData,
  IGraphEdge,
  IGraphNode,
  NodeType,
} from '../../../../shared/graph/contracts';
import type { IGraphViewContributionStatus } from '../../../../shared/protocol/extensionToWebview';
import {
  countGraphLayoutHiddenDescendants,
  getGraphLayoutCollapsedRepresentative,
  getGraphLayoutPinCoordinate,
  getGraphLayoutSectionWorldTopLeft,
  isGraphLayoutSectionNodeVisible,
  type GraphLayoutMode,
  type GraphLayoutSection,
  type GraphLayoutSettings,
} from '../../../../shared/settings/graphLayout';

export const ORGANIZE_PLUGIN_ID = 'codegraphy.organize';
export const ORGANIZE_GRAPH_SECTION_NODE_CONTRIBUTION_ID = 'codegraphy.organize.section-nodes';
export const ORGANIZE_SECTION_MEMBERSHIP_EDGE_CONTRIBUTION_ID =
  'codegraphy.organize.section-membership-edges';
export const ORGANIZE_GRAPH_SECTION_PROJECTION_CONTRIBUTION_ID =
  'codegraphy.organize.graph-section-projection';

const ORGANIZE_RUNTIME_NODE_TYPE = 'codegraphy.organize.graph-section';
const ORGANIZE_RUNTIME_EDGE_TYPE = 'codegraphy.organize.section-membership';
const GRAPH_SECTION_NODE_TYPE = 'graph-section' as NodeType;
const SECTION_MEMBERSHIP_EDGE_KIND =
  'codegraphy.organize:section-membership' as GraphEdgeKind;

interface ProjectedGraphEdge extends IGraphEdge {
  projectedEdgeCount?: number;
  projectedEdgeIds?: string[];
}

interface OrganizeGraphSectionRuntimeNode extends IGraphNode {
  hiddenDescendantCount: number;
  icon?: string;
  isCollapsedGraphSection: boolean;
  isGraphSection: true;
  ownerPluginId: string;
  ownerSectionId: string | null;
  runtimeNodeType: string;
  sectionHeight: number;
  sectionWidth: number;
  size: number;
}

interface OrganizeGraphSectionRuntimeEdge extends IGraphEdge {
  ownerPluginId: string;
  runtimeEdgeType: string;
}

function hasContributionStatus(
  statuses: readonly IGraphViewContributionStatus[],
  kind: IGraphViewContributionStatus['kind'],
  contributionId: string,
): boolean {
  return statuses.some(status =>
    status.kind === kind
    && status.pluginId === ORGANIZE_PLUGIN_ID
    && status.contributionId === contributionId
  );
}

export function hasOrganizeGraphSectionContributions(
  statuses: readonly IGraphViewContributionStatus[],
): boolean {
  return hasContributionStatus(statuses, 'runtimeNodes', ORGANIZE_GRAPH_SECTION_NODE_CONTRIBUTION_ID)
    && hasContributionStatus(statuses, 'projections', ORGANIZE_GRAPH_SECTION_PROJECTION_CONTRIBUTION_ID);
}

function getSectionNodeSize(section: Pick<GraphLayoutSection, 'height' | 'width'>): number {
  return Math.max(24, Math.min(48, Math.sqrt(section.width * section.height) / 12));
}

function shouldCreateGraphSectionRuntimeSurfaces(
  graphMode: GraphLayoutMode,
  timelineActive: boolean,
): boolean {
  return graphMode === '2d' && !timelineActive;
}

function getSectionCenter(
  layout: Pick<GraphLayoutSettings, 'ownership' | 'sections'>,
  section: GraphLayoutSection,
): { x: number; y: number } {
  const topLeft = getGraphLayoutSectionWorldTopLeft(layout, section.id) ?? {
    x: section.x,
    y: section.y,
  };

  return {
    x: topLeft.x + (section.width / 2),
    y: topLeft.y + (section.height / 2),
  };
}

function createGraphSectionRuntimeNode(
  layout: GraphLayoutSettings,
  visibleGraph: IGraphData,
  section: GraphLayoutSection,
): OrganizeGraphSectionRuntimeNode {
  const ownerSectionId = layout.ownership[section.id]?.ownerSectionId ?? null;
  const center = getSectionCenter(layout, section);
  const pinCoordinate = getGraphLayoutPinCoordinate(layout.pinnedNodes[section.id], '2d');
  const hiddenDescendantCount = section.collapsed
    ? countGraphLayoutHiddenDescendants(layout, section.id, visibleGraph.nodes.map(node => node.id))
    : 0;

  return {
    id: section.id,
    label: section.label,
    color: section.color,
    ...(section.icon ? { icon: section.icon } : {}),
    hiddenDescendantCount,
    isCollapsedGraphSection: section.collapsed,
    isGraphSection: true,
    metadata: {
      collapsed: section.collapsed,
      graphSectionId: section.id,
      hiddenDescendantCount,
      organizeFeature: 'section',
      ownerSectionId,
    },
    nodeType: GRAPH_SECTION_NODE_TYPE,
    ownerPluginId: ORGANIZE_PLUGIN_ID,
    ownerSectionId,
    runtimeNodeType: ORGANIZE_RUNTIME_NODE_TYPE,
    sectionHeight: section.height,
    sectionWidth: section.width,
    shape2D: 'square',
    size: getSectionNodeSize(section),
    x: pinCoordinate?.x ?? center.x,
    y: pinCoordinate?.y ?? center.y,
  };
}

function createGraphSectionRuntimeNodes(
  layout: GraphLayoutSettings,
  visibleGraph: IGraphData,
): OrganizeGraphSectionRuntimeNode[] {
  return Object.values(layout.sections)
    .filter(section => isGraphLayoutSectionNodeVisible(layout, section.id))
    .map(section => createGraphSectionRuntimeNode(layout, visibleGraph, section));
}

function createSectionMembershipSource() {
  return {
    id: `${ORGANIZE_PLUGIN_ID}:section-membership`,
    pluginId: ORGANIZE_PLUGIN_ID,
    sourceId: 'section-membership',
    label: 'Graph Section Membership',
  };
}

function createGraphSectionMembershipRuntimeEdges(
  layout: GraphLayoutSettings,
  visibleGraph: IGraphData,
): OrganizeGraphSectionRuntimeEdge[] {
  const knownNodeIds = new Set(visibleGraph.nodes.map(node => node.id));
  const edges: OrganizeGraphSectionRuntimeEdge[] = [];

  for (const record of Object.values(layout.ownership)) {
    if (!record.ownerSectionId || !knownNodeIds.has(record.ownerSectionId) || !knownNodeIds.has(record.itemId)) {
      continue;
    }

    edges.push({
      id: `${record.ownerSectionId}->${record.itemId}#${SECTION_MEMBERSHIP_EDGE_KIND}`,
      from: record.ownerSectionId,
      to: record.itemId,
      kind: SECTION_MEMBERSHIP_EDGE_KIND,
      metadata: {
        organizeFeature: 'section-membership',
        ownerSectionId: record.ownerSectionId,
      },
      ownerPluginId: ORGANIZE_PLUGIN_ID,
      runtimeEdgeType: ORGANIZE_RUNTIME_EDGE_TYPE,
      sources: [createSectionMembershipSource()],
    });
  }

  return edges;
}

function shouldProjectGraphSections(
  graphLayout: GraphLayoutSettings | undefined,
  graphMode: GraphLayoutMode,
  timelineActive: boolean,
): graphLayout is GraphLayoutSettings {
  return !!graphLayout
    && graphMode === '2d'
    && !timelineActive
    && Object.keys(graphLayout.sections).some(sectionId => graphLayout.sections[sectionId]?.collapsed);
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
  return nodes.filter((node) => {
    const representative = getGraphLayoutCollapsedRepresentative(graphLayout, node.id);
    return representative === null || representative === node.id;
  });
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

function projectGraphSectionsForRendering({
  data,
  graphLayout,
  graphMode = '2d',
  timelineActive,
}: {
  data: IGraphData;
  graphLayout?: GraphLayoutSettings;
  graphMode?: GraphLayoutMode;
  timelineActive: boolean;
}): IGraphData {
  if (!shouldProjectGraphSections(graphLayout, graphMode, timelineActive)) {
    return data;
  }

  return {
    edges: projectGraphEdges(data.edges, graphLayout),
    nodes: projectGraphNodes(data.nodes, graphLayout),
  };
}

function createEmptyGraphViewContributionSet(): CoreGraphViewContributionSet {
  return {
    runtimeNodes: [],
    runtimeEdges: [],
    projections: [],
    forces: [],
    contextMenu: [],
    ui: [],
  };
}

export function createOrganizeGraphViewContributions({
  graphLayout,
  statuses,
}: {
  graphLayout: GraphLayoutSettings;
  statuses: readonly IGraphViewContributionStatus[];
}): CoreGraphViewContributionSet | undefined {
  if (!hasOrganizeGraphSectionContributions(statuses)) {
    return undefined;
  }

  const contributions = createEmptyGraphViewContributionSet();
  contributions.runtimeNodes.push({
    pluginId: ORGANIZE_PLUGIN_ID,
    contribution: {
      id: ORGANIZE_GRAPH_SECTION_NODE_CONTRIBUTION_ID,
      label: 'Graph Section Nodes',
      createNodes: ({ visibleGraph, graphMode = '2d', timelineActive = false }) =>
        shouldCreateGraphSectionRuntimeSurfaces(graphMode, timelineActive)
          ? createGraphSectionRuntimeNodes(graphLayout, visibleGraph)
          : [],
    },
  });
  if (
    hasContributionStatus(
      statuses,
      'runtimeEdges',
      ORGANIZE_SECTION_MEMBERSHIP_EDGE_CONTRIBUTION_ID,
    )
  ) {
    contributions.runtimeEdges.push({
      pluginId: ORGANIZE_PLUGIN_ID,
      contribution: {
        id: ORGANIZE_SECTION_MEMBERSHIP_EDGE_CONTRIBUTION_ID,
        label: 'Graph Section Membership Edges',
        createEdges: ({ visibleGraph, graphMode = '2d', timelineActive = false }) =>
          shouldCreateGraphSectionRuntimeSurfaces(graphMode, timelineActive)
            ? createGraphSectionMembershipRuntimeEdges(graphLayout, visibleGraph)
            : [],
      },
    });
  }
  contributions.projections.push({
    pluginId: ORGANIZE_PLUGIN_ID,
    contribution: {
      id: ORGANIZE_GRAPH_SECTION_PROJECTION_CONTRIBUTION_ID,
      label: 'Graph Section Projection',
      project: ({ visibleGraph, graphMode = '2d', timelineActive = false }) =>
        projectGraphSectionsForRendering({
          data: visibleGraph,
          graphLayout,
          graphMode,
          timelineActive,
        }),
    },
  });

  return contributions;
}
