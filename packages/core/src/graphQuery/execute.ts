import { getNodeType } from '../visibleGraph/model';
import type { GraphQueryData } from './data';
import type {
  GraphQueryConfig,
  GraphQueryConnectionConfig,
  GraphQueryOverviewConfig,
  GraphQueryPathConfig,
  GraphQueryRequest,
  GraphQueryResult,
  GraphQuerySearchConfig,
  GraphQuerySymbolsConfig,
  GraphQueryTaskMapConfig,
} from './model';
import { inspectGraphTarget } from './overview';
import { findGraphPaths } from './paths';
import { listGraphEdges, listGraphNodes } from './reports';
import { listGraphRelationships } from './relationships';
import { searchGraph } from './search';
import { listGraphSymbols } from './symbols';
import { mapGraphTask } from './taskMap';
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
  search: GraphQueryHandler<GraphQuerySearchConfig>;
  'task-map': GraphQueryHandler<GraphQueryTaskMapConfig>;
  overview: GraphQueryHandler<GraphQueryOverviewConfig>;
};

function deriveScopedQueryData(
  data: GraphQueryData,
  config: GraphQueryConfig,
): GraphQueryData {
  const graphData = deriveScopedGraphQueryData(data.graphData, config);
  const nodeIds = new Set(graphData.nodes.map(node => node.id));
  const filePaths = new Set(
    graphData.nodes.filter(node => getNodeType(node) === 'file').map(node => node.id),
  );
  const sourceFiles = data.sourceText?.files.filter(file => filePaths.has(file.filePath));

  return {
    ...data,
    graphData,
    symbols: data.symbols?.filter(symbol => nodeIds.has(symbol.id)),
    ...(data.sourceText && sourceFiles
      ? {
          sourceText: {
            ...data.sourceText,
            files: sourceFiles,
            filesScanned: sourceFiles.length,
          },
        }
      : {}),
  };
}

const GRAPH_QUERY_HANDLERS: GraphQueryHandlers = {
  nodes: (data, args) => listGraphNodes(data.graphData, args),
  edges: (data, args) => listGraphEdges(data.graphData, args),
  relationships: (data, args) => listGraphRelationships(data, args),
  symbols: (data, args) => listGraphSymbols(data, args),
  paths: (data, args) => findGraphPaths(deriveScopedGraphQueryData(data.graphData, args), args),
  search: (data, args) => searchGraph(deriveScopedQueryData(data, args), args),
  'task-map': (data, args) => mapGraphTask(deriveScopedQueryData(data, args), args),
  overview: (data, args) => inspectGraphTarget(deriveScopedQueryData(data, args), args),
};

export function executeGraphQuery(
  data: GraphQueryData,
  request: GraphQueryRequest,
): GraphQueryResult {
  const handler = GRAPH_QUERY_HANDLERS[request.report] as GraphQueryHandler<typeof request.arguments>;
  return handler(data, request.arguments);
}
