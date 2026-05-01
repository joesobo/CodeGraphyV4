import type { GraphQueryData } from './data';
import type { GraphQueryRequest, GraphQueryResult } from './model';
import { findGraphPaths } from './paths';
import { listGraphEdges, listGraphNodes } from './reports';
import { listGraphRelationships } from './relationships';
import { listGraphSymbols } from './symbols';

export function executeGraphQuery(
  data: GraphQueryData,
  request: GraphQueryRequest,
): GraphQueryResult {
  switch (request.report) {
    case 'nodes':
      return listGraphNodes(data.graphData, request.arguments ?? {});
    case 'edges':
      return listGraphEdges(data.graphData, request.arguments ?? {});
    case 'relationships':
      return listGraphRelationships(data, request.arguments ?? {});
    case 'symbols':
      return listGraphSymbols(data, request.arguments ?? {});
    case 'paths':
      return findGraphPaths(data.graphData, request.arguments);
  }
}
