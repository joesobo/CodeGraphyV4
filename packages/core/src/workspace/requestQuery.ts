import * as path from 'node:path';
import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import { createDiagnosticEvent } from '../diagnostics/events';
import { loadWorkspaceAnalysisDatabaseCache, readWorkspaceAnalysisDatabaseSnapshot } from '../graphCache/database/storage';
import { buildWorkspaceGraphDataFromAnalysis } from '../graph/data';
import {
  createDisabledPluginSet,
  createPluginActivityState,
} from '../plugins/activityState/model';
import {
  filterInactivePluginFileAnalysis,
  filterInactivePluginSnapshotFacts,
} from '../plugins/activityState/analysisFacts';
import {
  readCodeGraphyInstalledPluginCache,
  type CodeGraphyInstalledPluginCache,
} from '../plugins/installedCache';
import {
  executeGraphQuery,
  type GraphQueryRequest,
} from '../graphQuery';
import {
  CODEGRAPHY_MARKDOWN_PLUGIN_ID,
  readCodeGraphyWorkspaceSettings,
  type CodeGraphyWorkspaceSettings,
} from './settings';
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

function collectDirectoryPaths(filePaths: Iterable<string>): string[] {
  const directories = new Set<string>();

  for (const filePath of filePaths) {
    let directory = path.posix.dirname(filePath.replace(/\\/g, '/'));
    while (directory && directory !== '.') {
      directories.add(directory);
      directory = path.posix.dirname(directory);
    }
  }

  return [...directories].sort();
}

function createGraphQueryActivePluginSet(
  settings: CodeGraphyWorkspaceSettings,
  installedPluginCache: CodeGraphyInstalledPluginCache,
): Set<string> {
  const activityState = createPluginActivityState({
    settings,
    installedPlugins: installedPluginCache.plugins,
    builtInPluginIds: [CODEGRAPHY_MARKDOWN_PLUGIN_ID],
  });
  return new Set(activityState.activePluginIds);
}

export async function requestWorkspaceGraphQuery(
  input: WorkspaceGraphQueryInput,
  dependencies: WorkspaceGraphQueryDependencies = DEFAULT_DEPENDENCIES,
): Promise<WorkspaceGraphQueryResult> {
  const startedAt = performance.now();
  const workspaceRoot = resolveCodeGraphyWorkspacePath(input.workspacePath, dependencies.cwd());
  const operationId = createGraphQueryOperationId();
  input.diagnostics?.emit(createDiagnosticEvent({
    area: 'graph-query',
    event: 'started',
    context: {
      operationId,
      workspaceRoot,
      report: input.report,
    },
  }));
  const status = readCodeGraphyWorkspaceStatus(workspaceRoot);
  if (!status.hasGraphCache) {
    input.diagnostics?.emit(createDiagnosticEvent({
      area: 'graph-query',
      event: 'cache-missing',
      context: {
        operationId,
        workspaceRoot,
        report: input.report,
        cacheState: status.state,
        staleReasons: status.staleReasons,
      },
    }));
    return {
      error: 'graph_cache_not_found',
      message: 'This CodeGraphy Workspace has not been indexed. Run `codegraphy_index`, then retry.',
      workspaceRoot,
    };
  }

  const settings = readCodeGraphyWorkspaceSettings(workspaceRoot);
  const disabledPlugins = createDisabledPluginSet(settings);
  const cache = loadWorkspaceAnalysisDatabaseCache(workspaceRoot);
  const snapshot = readWorkspaceAnalysisDatabaseSnapshot(workspaceRoot);
  const activePluginIds = createGraphQueryActivePluginSet(
    settings,
    dependencies.readInstalledPluginCache(),
  );
  const activeSnapshotFacts = filterInactivePluginSnapshotFacts(snapshot, activePluginIds);
  const fileAnalysis = new Map<string, IFileAnalysisResult>(
    Object.entries(cache.files).map(([filePath, entry]) => [filePath, entry.analysis]),
  );
  const graphData = buildWorkspaceGraphDataFromAnalysis({
    cacheFiles: cache.files,
    directoryPaths: collectDirectoryPaths(Object.keys(cache.files)),
    disabledPlugins,
    fileAnalysis: filterInactivePluginFileAnalysis(fileAnalysis, activePluginIds),
    getPluginForFile: () => undefined,
    showOrphans: settings.showOrphans,
    workspaceRoot,
  });
  const queryResult = executeGraphQuery({
    graphData,
    symbols: activeSnapshotFacts.symbols,
    relations: activeSnapshotFacts.relations,
  }, {
    report: input.report,
    arguments: input.arguments,
  } as GraphQueryRequest);
  input.diagnostics?.emit(createDiagnosticEvent({
    area: 'graph-query',
    event: 'completed',
    context: {
      operationId,
      report: input.report,
      cacheState: status.state,
      staleReasons: status.staleReasons,
      nodeCount: graphData.nodes.length,
      edgeCount: graphData.edges.length,
      durationMs: Math.round(performance.now() - startedAt),
    },
  }));

  return {
    ...queryResult,
    workspaceRoot,
    cacheStatus: {
      state: status.state,
      staleReasons: status.staleReasons,
    },
  };
}
