import * as path from 'node:path';
import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import { loadWorkspaceAnalysisDatabaseCache, readWorkspaceAnalysisDatabaseSnapshot } from '../graphCache/database/storage';
import { buildWorkspaceGraphDataFromAnalysis } from '../graph/data';
import {
  executeGraphQuery,
  type GraphQueryRequest,
} from '../graphQuery';
import {
  readCodeGraphyWorkspaceSettings,
} from './settings';
import { resolveCodeGraphyWorkspacePath } from './requestPaths';
import type { WorkspaceGraphQueryInput, WorkspaceGraphQueryResult } from './requestTypes';
import { readCodeGraphyWorkspaceStatus } from './status';

export interface WorkspaceGraphQueryDependencies {
  cwd(): string;
}

const DEFAULT_DEPENDENCIES: WorkspaceGraphQueryDependencies = {
  cwd: () => process.cwd(),
};

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

export async function requestWorkspaceGraphQuery(
  input: WorkspaceGraphQueryInput,
  dependencies: WorkspaceGraphQueryDependencies = DEFAULT_DEPENDENCIES,
): Promise<WorkspaceGraphQueryResult> {
  const workspaceRoot = resolveCodeGraphyWorkspacePath(input.workspacePath, dependencies.cwd());
  const status = readCodeGraphyWorkspaceStatus(workspaceRoot);
  if (!status.hasGraphCache) {
    return {
      error: 'graph_cache_not_found',
      message: 'This CodeGraphy Workspace has not been indexed. Run `codegraphy_index`, then retry.',
      workspaceRoot,
    };
  }

  const settings = readCodeGraphyWorkspaceSettings(workspaceRoot);
  const cache = loadWorkspaceAnalysisDatabaseCache(workspaceRoot);
  const snapshot = readWorkspaceAnalysisDatabaseSnapshot(workspaceRoot);
  const fileAnalysis = new Map<string, IFileAnalysisResult>(
    Object.entries(cache.files).map(([filePath, entry]) => [filePath, entry.analysis]),
  );
  const graphData = buildWorkspaceGraphDataFromAnalysis({
    cacheFiles: cache.files,
    churnCounts: {},
    directoryPaths: collectDirectoryPaths(Object.keys(cache.files)),
    disabledPlugins: new Set(),
    fileAnalysis,
    getPluginForFile: () => undefined,
    showOrphans: settings.showOrphans,
    workspaceRoot,
  });

  return {
    ...executeGraphQuery({
      graphData,
      symbols: snapshot.symbols,
      relations: snapshot.relations,
    }, {
      report: input.report,
      arguments: input.arguments,
    } as GraphQueryRequest),
    workspaceRoot,
    cacheStatus: {
      state: status.state,
      staleReasons: status.staleReasons,
    },
  };
}
