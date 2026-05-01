import type { GraphEdgeKind, IGraphData, IGraphEdge, IGraphNode, NodeType } from '../../shared/graph/contracts';
import { getNodeType } from '../../shared/visibleGraph/model';
import { applyReportFilters } from './filter';
import type {
  GraphQueryConfig,
  GraphQueryEdgeReport,
  GraphQueryEdgeReportItem,
  GraphQueryNodeReport,
  GraphQueryNodeReportItem,
} from './model';
import { paginate } from './pagination';
import { sortItems } from './sort';
import {
  applySearchAndOrphans,
  deriveScopedGraphQueryData,
  filterEdgesToReportNodes,
} from './visible';

function toNodeReportItem(node: IGraphNode): GraphQueryNodeReportItem {
  return {
    path: node.id,
    nodeType: getNodeType(node) as NodeType,
  };
}

function readNodeReportValue(item: GraphQueryNodeReportItem, field: string): string {
  switch (field) {
    case 'path':
      return item.path;
    case 'nodeType':
      return item.nodeType;
    default:
      return '';
  }
}

function readEdgeValue(edge: IGraphEdge, field: string): string | readonly string[] {
  switch (field) {
    case 'from':
      return edge.from;
    case 'to':
      return edge.to;
    case 'edgeType':
    case 'edgeTypes':
      return edge.kind;
    default:
      return '';
  }
}

function edgeGroupKey(edge: IGraphEdge): string {
  return `${edge.from}\u0000${edge.to}`;
}

function groupEdges(edges: readonly IGraphEdge[]): GraphQueryEdgeReportItem[] {
  const groups = new Map<string, GraphQueryEdgeReportItem>();

  for (const edge of edges) {
    const key = edgeGroupKey(edge);
    const group = groups.get(key);

    if (group) {
      if (!group.edgeTypes.includes(edge.kind)) {
        group.edgeTypes.push(edge.kind);
      }
      continue;
    }

    groups.set(key, {
      from: edge.from,
      to: edge.to,
      edgeTypes: [edge.kind],
    });
  }

  return [...groups.values()];
}

function readEdgeReportValue(item: GraphQueryEdgeReportItem, field: string): string | readonly GraphEdgeKind[] {
  switch (field) {
    case 'from':
      return item.from;
    case 'to':
      return item.to;
    case 'edgeType':
    case 'edgeTypes':
      return item.edgeTypes;
    default:
      return '';
  }
}

export function listGraphNodes(
  graphData: IGraphData,
  config: GraphQueryConfig = {},
): GraphQueryNodeReport {
  const scopedGraph = deriveScopedGraphQueryData(graphData, config);
  const filteredNodes = applyReportFilters(
    scopedGraph.nodes.map(toNodeReportItem),
    config.filters,
    readNodeReportValue,
  );
  const filteredNodeIds = new Set(filteredNodes.map((node) => node.path));
  const filteredGraph = {
    nodes: scopedGraph.nodes.filter((node) => filteredNodeIds.has(node.id)),
    edges: scopedGraph.edges,
  };
  const visibleGraph = applySearchAndOrphans({
    ...filteredGraph,
    edges: filterEdgesToReportNodes(filteredGraph.edges, filteredGraph.nodes),
  }, config);
  const sortedNodes = sortItems(
    visibleGraph.nodes.map(toNodeReportItem),
    config.sort,
    [{ by: 'path', direction: 'asc' }],
    readNodeReportValue,
  );
  const page = paginate(sortedNodes, config);

  return {
    nodes: page.items,
    page: page.page,
  };
}

export function listGraphEdges(
  graphData: IGraphData,
  config: GraphQueryConfig = {},
): GraphQueryEdgeReport {
  const scopedGraph = deriveScopedGraphQueryData(graphData, config);
  const scopedEdges = filterEdgesToReportNodes(scopedGraph.edges, scopedGraph.nodes);
  const filteredEdges = applyReportFilters(scopedEdges, config.filters, readEdgeValue);
  const visibleGraph = applySearchAndOrphans({
    nodes: scopedGraph.nodes,
    edges: filteredEdges,
  }, config);
  const groupedEdges = groupEdges(filterEdgesToReportNodes(visibleGraph.edges, visibleGraph.nodes));
  const sortedEdges = sortItems(
    groupedEdges,
    config.sort,
    [
      { by: 'from', direction: 'asc' },
      { by: 'to', direction: 'asc' },
    ],
    readEdgeReportValue,
  );
  const page = paginate(sortedEdges, config);

  return {
    edges: page.items,
    page: page.page,
  };
}
