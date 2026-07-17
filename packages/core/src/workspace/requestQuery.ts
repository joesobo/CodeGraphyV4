import {
  readCodeGraphyInstalledPluginCache,
  type CodeGraphyInstalledPluginCache,
} from '../plugins/installedCache';
import {
  executeGraphQuery,
  type GraphQueryRequest,
} from '../graphQuery';
import { emitGraphQueryCacheMissing, emitGraphQueryCompleted, emitGraphQueryStarted } from './queryDiagnostics';
import { readWorkspaceQueryGraph } from './queryGraph';
import { resolveCodeGraphyWorkspacePath } from './requestPaths';
import type { WorkspaceGraphQueryInput, WorkspaceGraphQueryResult } from './requestTypes';
import { readCodeGraphyWorkspaceStatus } from './status';

export interface WorkspaceGraphQueryDependencies {
  cwd(): string;
  readInstalledPluginCache(): CodeGraphyInstalledPluginCache;
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

export async function requestWorkspaceGraphQuery(
  input: WorkspaceGraphQueryInput,
  dependencies: WorkspaceGraphQueryDependencies = DEFAULT_DEPENDENCIES,
): Promise<WorkspaceGraphQueryResult> {
  const startedAt = performance.now();
  const workspaceRoot = resolveCodeGraphyWorkspacePath(input.workspacePath, dependencies.cwd());
  const operationId = createGraphQueryOperationId();
  emitGraphQueryStarted({ diagnostics: input.diagnostics, operationId, report: input.report, workspaceRoot });
  const status = readCodeGraphyWorkspaceStatus(workspaceRoot);
  if (!status.hasGraphCache) {
    emitGraphQueryCacheMissing({
      diagnostics: input.diagnostics,
      operationId,
      report: input.report,
      status,
      workspaceRoot,
    });
    return {
      error: 'graph_cache_not_found',
      message: 'This CodeGraphy Workspace has not been indexed. Run `codegraphy index`, then retry.',
      workspaceRoot,
    };
  }

  const { graphData, scope, settings, snapshotFacts } = readWorkspaceQueryGraph(
    workspaceRoot,
    dependencies.readInstalledPluginCache(),
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
      showOrphans: settings.showOrphans,
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
