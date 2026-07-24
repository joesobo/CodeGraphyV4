import type { FileDiscovery } from '@codegraphy-dev/core';
import type { Configuration } from '../../../config/reader';
import type { PluginRegistry } from '../../../../core/plugins/registry/manager';
import type { IGraphData } from '../../../../shared/graph/contracts';
import type { IWorkspaceAnalysisCache } from '../../cache';
import type { WorkspacePipelineCachePatch } from '../cache/storage';
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
  _config: Pick<Configuration, 'get' | 'getAll'>;
  _discovery: Pick<FileDiscovery, 'discover'>;
  _getActiveAnalysisPluginIds(
    pluginIds: readonly string[] | undefined,
    disabledPlugins: ReadonlySet<string>,
  ): string[];
  _getWorkspaceRoot(): string | undefined;
  _lastGitIgnoredPaths: string[];
  _persistCache(): void;
  _persistCachePatch(patch: WorkspacePipelineCachePatch): void;
  _persistIndexMetadata(): Promise<void>;
  _registry: Pick<PluginRegistry, 'list' | 'notifyFilesChanged'>;
  _toWorkspaceRelativePath(workspaceRoot: string, filePath: string): string | undefined;
  getPluginFilterPatterns(disabledPlugins: Set<string>): string[];
}

export const EMPTY_REFRESH_GRAPH: IGraphData = { nodes: [], edges: [] };
