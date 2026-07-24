import * as vscode from 'vscode';
import type { FileDiscovery } from '@codegraphy-dev/core';
import type { IGraphData } from '../../../shared/graph/contracts';
import type { Configuration } from '../../config/reader';
import type { IWorkspaceAnalysisCache } from '../cache';
import { saveWorkspaceAnalysisDatabaseCacheAsync } from '../database/cache/storage';
import {
  analyzeWorkspaceWithAnalyzer,
  type WorkspacePipelineAnalysisSource,
} from './analyze';

export function runWorkspacePipelineAnalysis(
  source: WorkspacePipelineAnalysisSource,
  cache: IWorkspaceAnalysisCache,
  config: Pick<Configuration, 'getAll'>,
  discovery: Pick<FileDiscovery, 'discover'>,
  getWorkspaceRoot: () => string | undefined,
  filterPatterns: string[] = [],
  disabledPlugins: Set<string> = new Set(),
  onProgress?: (progress: { phase: string; current: number; total: number }) => void,
  signal?: AbortSignal,
): Promise<IGraphData> {
  return analyzeWorkspaceWithAnalyzer(
    source,
    {
      discover: async options => {
        const result = await discovery.discover(options);
        const cacheFilePaths = new Set(result.cacheFilePaths);
        for (const filePath of Object.keys(cache.files)) {
          if (!cacheFilePaths.has(filePath)) {
            delete cache.files[filePath];
          }
        }
        return {
          directories: result.directories,
          durationMs: result.durationMs,
          files: result.files,
          cacheFilePaths: result.cacheFilePaths,
          gitIgnoredPaths: result.gitIgnoredPaths,
          limitReached: result.limitReached,
          totalFound: result.totalFound ?? result.files.length,
        };
      },
      getConfig: () => config.getAll(),
      getWorkspaceRoot,
      logInfo: message => {
        console.log(message);
      },
      saveCache: async (graph, onProgress) => {
        const workspaceRoot = getWorkspaceRoot();
        if (workspaceRoot) {
          try {
            await saveWorkspaceAnalysisDatabaseCacheAsync(workspaceRoot, cache, {
              graph,
              nodeTypes: source._listPluginNodeTypes?.(disabledPlugins),
              onProgress,
            });
          } catch (error) {
            console.warn('[CodeGraphy] Failed to persist repo-local analysis cache.', error);
          }
        }
      },
      showWarningMessage: message => {
        vscode.window.showWarningMessage(message);
      },
      sendProgress: onProgress,
    },
    filterPatterns,
    disabledPlugins,
    signal,
  );
}
