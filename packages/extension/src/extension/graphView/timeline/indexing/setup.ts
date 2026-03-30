import type { ICommitInfo } from '../../../../shared/timeline/types';
import { DEFAULT_EXCLUDE_PATTERNS } from '../../../config/defaults';

interface GraphViewTimelineAnalyzerLike {
  initialize(): Promise<void>;
  getPluginFilterPatterns(): string[];
}

interface GraphViewGitAnalyzerLike {
  indexHistory(
    onProgress: (phase: string, current: number, total: number) => void,
    signal: AbortSignal,
    maxCommits: number,
  ): Promise<ICommitInfo[]>;
}

export interface GraphViewTimelineIndexSetupState {
  analyzer: GraphViewTimelineAnalyzerLike | undefined;
  analyzerInitialized: boolean;
  gitAnalyzer: GraphViewGitAnalyzerLike | undefined;
  indexingController: AbortController | undefined;
  filterPatterns: string[];
}

export interface GraphViewTimelineIndexSetupHandlers {
  workspaceFolder: { uri: { fsPath: string } } | undefined;
  verifyGitRepository(cwd: string): Promise<void>;
  createGitAnalyzer(
    workspaceRoot: string,
    mergedExclude: string[],
  ): GraphViewGitAnalyzerLike;
  showErrorMessage(message: string): void;
}

export async function prepareGraphViewTimelineIndex(
  state: GraphViewTimelineIndexSetupState,
  handlers: GraphViewTimelineIndexSetupHandlers,
): Promise<boolean> {
  const workspaceFolder = handlers.workspaceFolder;
  if (!workspaceFolder) {
    handlers.showErrorMessage('No workspace folder open');
    return false;
  }

  try {
    await handlers.verifyGitRepository(workspaceFolder.uri.fsPath);
  } catch {
    handlers.showErrorMessage('This workspace is not a git repository');
    return false;
  }

  state.indexingController?.abort();
  state.indexingController = new AbortController();

  if (!state.analyzer) return false;
  if (!state.analyzerInitialized) {
    await state.analyzer.initialize();
    state.analyzerInitialized = true;
  }

  if (!state.gitAnalyzer) {
    const mergedExclude = [
      ...new Set([
        ...DEFAULT_EXCLUDE_PATTERNS,
        ...state.analyzer.getPluginFilterPatterns(),
        ...state.filterPatterns,
      ]),
    ];
    state.gitAnalyzer = handlers.createGitAnalyzer(workspaceFolder.uri.fsPath, mergedExclude);
  }

  return true;
}
