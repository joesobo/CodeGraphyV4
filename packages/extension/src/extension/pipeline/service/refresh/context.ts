import type { AnalysisCacheTier, FileDiscovery } from '@codegraphy-dev/core';
import type { Configuration } from '../../../config/reader';
import type { PluginRegistry } from '../../../../core/plugins/registry/manager';
import type { IGraphData } from '../../../../shared/graph/contracts';
import type { IWorkspaceAnalysisCache } from '../../cache';
import type { WorkspacePipelineCachePatch } from '../cache/storage';
import type { WorkspacePipelineRefreshState } from '../base/state';
import type { AnalysisScopeRefreshFacade } from './scope';
import type { RefreshSourceFacade } from './source';

export type RefreshProgress = {
  phase: string;
  current: number;
  total: number;
};

export interface RefreshFacadeContext
  extends AnalysisScopeRefreshFacade, RefreshSourceFacade {
  _cache: IWorkspaceAnalysisCache;
  _completeGraphData: IGraphData;
  _config: Pick<Configuration, 'get' | 'getAll'>;
  _discovery: Pick<FileDiscovery, 'discover'>;
  _getActiveAnalysisPluginIds(
    pluginIds: readonly string[] | undefined,
    disabledPlugins: ReadonlySet<string>,
  ): string[];
  _captureRefreshState(): WorkspacePipelineRefreshState;
  _getWorkspaceRoot(): string | undefined;
  _lastGitIgnoredPaths: string[];
  _persistCache(): void;
  _persistCachePatch(patch: WorkspacePipelineCachePatch): Promise<void>;
  _persistIndexMetadata(resolvedChangedFilePaths?: readonly string[]): Promise<void>;
  _restoreRefreshState(snapshot: WorkspacePipelineRefreshState): void;
  _registry: Pick<PluginRegistry, 'list' | 'listNodeTypes' | 'notifyFilesChanged'>;
  _toWorkspaceRelativePath(workspaceRoot: string, filePath: string): string | undefined;
  getPluginFilterPatterns(disabledPlugins: Set<string>): string[];
  loadCachedGraph(
    filterPatterns?: string[],
    disabledPlugins?: Set<string>,
    signal?: AbortSignal,
    options?: {
      forceReloadGraphCache?: boolean;
      requiredAnalysisCacheTiers?: readonly AnalysisCacheTier[];
    },
  ): Promise<IGraphData>;
}

export const EMPTY_REFRESH_GRAPH: IGraphData = { nodes: [], edges: [] };
