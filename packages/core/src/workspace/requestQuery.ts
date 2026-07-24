import {
  readCodeGraphyInstalledPluginCache,
  type CodeGraphyInstalledPluginCache,
} from '../plugins/installedCache';
import {
  executeGraphQuery,
  type GraphQueryRequest,
} from '../graphQuery';
import { emitGraphQueryCacheMissing, emitGraphQueryCompleted, emitGraphQueryStarted } from './queryDiagnostics';
import {
  projectWorkspaceQueryGraph,
  readWorkspaceQuerySource,
  readWorkspaceQuerySourceText,
} from './queryGraph';
import { resolveCodeGraphyWorkspacePath } from './requestPaths';
import type {
  WorkspaceGraphQueryInput,
  WorkspaceGraphQueryResult,
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
  const sourceText = input.report === 'search'
    ? readWorkspaceQuerySourceText(workspaceRoot, graphData, source.indexedContentHashes)
    : undefined;
  const queryResult = executeGraphQuery({
    graphData,
    symbols: snapshotFacts.symbols,
    relations: snapshotFacts.relations,
    ...(sourceText ? { sourceText } : {}),
    cacheState: status.state === 'stale' || sourceText?.hasChangedFiles ? 'stale' : 'fresh',
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
