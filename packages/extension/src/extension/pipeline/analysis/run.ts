import * as vscode from 'vscode';
import type { FileDiscovery } from '../../../core/discovery/file/service';
import type { IGraphData } from '../../../shared/graph/contracts';
import type { Configuration } from '../../config/reader';
import type { IWorkspaceAnalysisCache } from '../cache';
import { saveWorkspaceAnalysisDatabaseCache } from '../database/cache';
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
        return {
          durationMs: result.durationMs,
          files: result.files,
          limitReached: result.limitReached,
          totalFound: result.totalFound ?? result.files.length,
        };
      },
      getConfig: () => config.getAll(),
      getWorkspaceRoot,
      logInfo: message => {
        console.log(message);
      },
      saveCache: () => {
        const workspaceRoot = getWorkspaceRoot();
        if (workspaceRoot) {
          try {
            saveWorkspaceAnalysisDatabaseCache(workspaceRoot, cache);
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
