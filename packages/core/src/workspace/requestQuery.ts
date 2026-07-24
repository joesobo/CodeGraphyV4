import {
  readCodeGraphyInstalledPluginCache,
  type CodeGraphyInstalledPluginCache,
} from '../plugins/installedCache';
import {
  executeGraphQuery,
  type GraphQueryRequest,
} from '../graphQuery';
import { emitGraphQueryCacheMissing, emitGraphQueryCompleted, emitGraphQueryStarted } from './queryDiagnostics';
import { projectWorkspaceQueryGraph, readWorkspaceQuerySource } from './queryGraph';
import { resolveCodeGraphyWorkspacePath } from './requestPaths';
import {
  MAX_WORKSPACE_GRAPH_QUERY_BATCH_SIZE,
  type WorkspaceGraphQueryBatchInput,
  type WorkspaceGraphQueryBatchResult,
  type WorkspaceGraphQueryInput,
  type WorkspaceGraphQueryResult,
} from './requestTypes';
import { readCodeGraphyWorkspaceStatus } from './status';

export interface WorkspaceGraphQueryDependencies {
  cwd(): string;
  readInstalledPluginCache(): CodeGraphyInstalledPluginCache;
  readQuerySource?(
    workspaceRoot: string,
    installedPluginCache: CodeGraphyInstalledPluginCache,
  ): ReturnType<typeof readWorkspaceQuerySource>;
}

const DEFAULT_DEPENDENCIES: WorkspaceGraphQueryDependencies = {
  cwd: () => process.cwd(),
  readInstalledPluginCache: () => readCodeGraphyInstalledPluginCache(),
};

let graphQueryOperationCounter = 0;

function createGraphQueryOperationId(): string {
  graphQueryOperationCounter += 1;
  return `query-${graphQueryOperationCounter}`;
}

function createCacheMissingResult(workspaceRoot: string): WorkspaceGraphQueryResult {
  return {
    error: 'graph_cache_not_found',
    message: 'This CodeGraphy Workspace has not been indexed. Run `codegraphy index`, then retry.',
    workspaceRoot,
  };
}

function executeWorkspaceGraphQuery(
  input: Omit<WorkspaceGraphQueryInput, 'workspacePath'>,
  workspaceRoot: string,
  status: ReturnType<typeof readCodeGraphyWorkspaceStatus>,
  source: ReturnType<typeof readWorkspaceQuerySource>,
): WorkspaceGraphQueryResult {
  const startedAt = performance.now();
  const operationId = createGraphQueryOperationId();
  emitGraphQueryStarted({ diagnostics: input.diagnostics, operationId, report: input.report, workspaceRoot });
  const { graphData, nodeTypes, scope, snapshotFacts } = projectWorkspaceQueryGraph(
    source,
    input.projection,
  );
  const queryResult = executeGraphQuery({
    graphData,
    symbols: snapshotFacts.symbols,
    relations: snapshotFacts.relations,
  }, {
    report: input.report,
    arguments: {
      scope: {
        nodes: scope.nodes,
        edges: scope.edges,
      },
      ...(input.projection?.nodeTypes
        ? {
            nodeTypeDefinitions: nodeTypes,
            projectedNodeTypes: input.projection.nodeTypes,
          }
        : {}),
      ...input.arguments,
    },
  } as GraphQueryRequest);
  emitGraphQueryCompleted({
    diagnostics: input.diagnostics,
    durationMs: Math.round(performance.now() - startedAt),
    edgeCount: graphData.edges.length,
    nodeCount: graphData.nodes.length,
    operationId,
    report: input.report,
    status,
  });

  return {
    ...queryResult,
    workspaceRoot,
    cacheStatus: {
      state: status.state,
      staleReasons: status.staleReasons,
    },
  };
}

export async function requestWorkspaceGraphQuery(
  input: WorkspaceGraphQueryInput,
  dependencies: WorkspaceGraphQueryDependencies = DEFAULT_DEPENDENCIES,
): Promise<WorkspaceGraphQueryResult> {
  const workspaceRoot = resolveCodeGraphyWorkspacePath(input.workspacePath, dependencies.cwd());
  const status = readCodeGraphyWorkspaceStatus(workspaceRoot);
  if (!status.hasGraphCache) {
    const operationId = createGraphQueryOperationId();
    emitGraphQueryStarted({ diagnostics: input.diagnostics, operationId, report: input.report, workspaceRoot });
    emitGraphQueryCacheMissing({
      diagnostics: input.diagnostics,
      operationId,
      report: input.report,
      status,
      workspaceRoot,
    });
    return createCacheMissingResult(workspaceRoot);
  }

  return executeWorkspaceGraphQuery(
    input,
    workspaceRoot,
    status,
    (dependencies.readQuerySource ?? readWorkspaceQuerySource)(
      workspaceRoot,
      dependencies.readInstalledPluginCache(),
    ),
  );
}

export async function requestWorkspaceGraphQueryBatch(
  input: WorkspaceGraphQueryBatchInput,
  dependencies: WorkspaceGraphQueryDependencies = DEFAULT_DEPENDENCIES,
): Promise<WorkspaceGraphQueryBatchResult> {
  if (input.queries.length < 1 || input.queries.length > MAX_WORKSPACE_GRAPH_QUERY_BATCH_SIZE) {
    throw new Error(`Batch queries must contain 1 through ${MAX_WORKSPACE_GRAPH_QUERY_BATCH_SIZE} items`);
  }
  const workspaceRoot = resolveCodeGraphyWorkspacePath(input.workspacePath, dependencies.cwd());
  const status = readCodeGraphyWorkspaceStatus(workspaceRoot);
  if (!status.hasGraphCache) {
    return {
      results: input.queries.map(query => {
        const operationId = createGraphQueryOperationId();
        emitGraphQueryStarted({ diagnostics: input.diagnostics, operationId, report: query.report, workspaceRoot });
        emitGraphQueryCacheMissing({
          diagnostics: input.diagnostics,
          operationId,
          report: query.report,
          status,
          workspaceRoot,
        });
        return createCacheMissingResult(workspaceRoot);
      }),
    };
  }

  const source = (dependencies.readQuerySource ?? readWorkspaceQuerySource)(
    workspaceRoot,
    dependencies.readInstalledPluginCache(),
  );
  return {
    results: input.queries.map(query => executeWorkspaceGraphQuery(
      { ...query, diagnostics: input.diagnostics },
      workspaceRoot,
      status,
      source,
    )),
  };
}
