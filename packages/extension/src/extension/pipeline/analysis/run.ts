import * as vscode from 'vscode';
import type { FileDiscovery } from '../../../core/discovery/file/service';
import type { IGraphData } from '../../../shared/graph/types';
import type { Configuration } from '../../config/reader';
import {
  saveWorkspaceAnalysisCache,
  type IWorkspaceAnalysisCache,
} from '../cache';
import { saveWorkspaceAnalysisDatabaseCache } from '../database/cache';
import {
  analyzeWorkspaceWithAnalyzer,
  type WorkspacePipelineAnalysisSource,
} from './analyze';

interface WorkspacePipelineRunWorkspaceState {
  update(key: string, value: unknown): PromiseLike<void>;
}

export function runWorkspacePipelineAnalysis(
  source: WorkspacePipelineAnalysisSource,
  cache: IWorkspaceAnalysisCache,
  config: Pick<Configuration, 'getAll'>,
  discovery: Pick<FileDiscovery, 'discover'>,
  workspaceState: WorkspacePipelineRunWorkspaceState,
  getWorkspaceRoot: () => string | undefined,
  filterPatterns: string[] = [],
  disabledSources: Set<string> = new Set(),
  disabledPlugins: Set<string> = new Set(),
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
        saveWorkspaceAnalysisCache(workspaceState.update.bind(workspaceState), cache);
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
    },
    filterPatterns,
    disabledSources,
    disabledPlugins,
    signal,
  );
}
