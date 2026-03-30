import * as vscode from 'vscode';
import type { FileDiscovery } from '../../../core/discovery/file/service';
import type { IGraphData } from '../../../shared/graph/types';
import type { Configuration } from '../../config/reader';
import {
  saveWorkspaceAnalysisCache,
  type IWorkspaceAnalysisCache,
} from '../cache';
import {
  analyzeWorkspaceWithAnalyzer,
  type WorkspaceAnalyzerAnalysisSource,
} from './analyze';

interface WorkspaceAnalyzerRunWorkspaceState {
  update(key: string, value: unknown): PromiseLike<void>;
}

export function runWorkspaceAnalyzerAnalysis(
  source: WorkspaceAnalyzerAnalysisSource,
  cache: IWorkspaceAnalysisCache,
  config: Pick<Configuration, 'getAll'>,
  discovery: Pick<FileDiscovery, 'discover'>,
  workspaceState: WorkspaceAnalyzerRunWorkspaceState,
  getWorkspaceRoot: () => string | undefined,
  filterPatterns: string[] = [],
  disabledRules: Set<string> = new Set(),
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
      },
      showWarningMessage: message => {
        vscode.window.showWarningMessage(message);
      },
    },
    filterPatterns,
    disabledRules,
    disabledPlugins,
    signal,
  );
}
