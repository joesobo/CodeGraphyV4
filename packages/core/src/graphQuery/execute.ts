import type { GraphQueryData } from './data';
import type {
  GraphQueryConfig,
  GraphQueryConnectionConfig,
  GraphQueryPathConfig,
  GraphQueryRequest,
  GraphQueryResult,
  GraphQuerySymbolsConfig,
} from './model';
import { findGraphPaths } from './paths';
import { listGraphEdges, listGraphNodes } from './reports';
import { listGraphRelationships } from './relationships';
import { listGraphSymbols } from './symbols';
import { deriveScopedGraphQueryData } from './visible';

type GraphQueryHandler<TArguments> = (
  data: GraphQueryData,
  args: TArguments,
) => GraphQueryResult;

type GraphQueryHandlers = {
  nodes: GraphQueryHandler<GraphQueryConfig | undefined>;
  edges: GraphQueryHandler<GraphQueryConnectionConfig | undefined>;
  relationships: GraphQueryHandler<GraphQueryConnectionConfig | undefined>;
  symbols: GraphQueryHandler<GraphQuerySymbolsConfig | undefined>;
  paths: GraphQueryHandler<GraphQueryPathConfig>;
};

const GRAPH_QUERY_HANDLERS: GraphQueryHandlers = {
  nodes: (data, args) => listGraphNodes(data.graphData, args),
  edges: (data, args) => listGraphEdges(data.graphData, args),
  relationships: (data, args) => listGraphRelationships(data, args),
  symbols: (data, args) => listGraphSymbols(data, args),
  paths: (data, args) => findGraphPaths(deriveScopedGraphQueryData(data.graphData, args), args),
};

export function executeGraphQuery(
  data: GraphQueryData,
  request: GraphQueryRequest,
): GraphQueryResult {
  const handler = GRAPH_QUERY_HANDLERS[request.report] as GraphQueryHandler<typeof request.arguments>;
  return handler(data, request.arguments);
}
