import type { IGraphData } from '../graph/contracts';
import { applyReportFilters } from './filter';
import type {
  GraphQueryConfig,
  GraphQueryConnectionConfig,
  GraphQueryEdgeReport,
  GraphQueryNodeReport,
} from './model';
import { groupEdges, readEdgeReportValue, readEdgeValue } from './edgeReport';
import { readNodeReportValue, toNodeReportItem } from './nodeReport';
import { paginate } from './pagination';
import { sortItems } from './sort';
import {
  applySearchAndOrphans,
  deriveScopedGraphQueryData,
  filterEdgesToReportNodes,
} from './visible';
import { applyDomainConnectionFilters } from './relationships/visibility';

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
  config: GraphQueryConnectionConfig = {},
): GraphQueryEdgeReport {
  const scopedGraph = deriveScopedGraphQueryData(graphData, config);
  const scopedEdges = filterEdgesToReportNodes(scopedGraph.edges, scopedGraph.nodes);
  const domainFilteredEdges = applyDomainConnectionFilters(scopedEdges, config);
  const filteredEdges = applyReportFilters(domainFilteredEdges, config.filters, readEdgeValue);
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
