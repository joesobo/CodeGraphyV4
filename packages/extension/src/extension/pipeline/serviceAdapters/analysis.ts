import type { IDiscoveredFile } from '@codegraphy-dev/core';
import { preAnalyzeCoreTreeSitterFiles } from '@codegraphy-dev/core';
import type { FileDiscovery } from '@codegraphy-dev/core';
import type { EventBus } from '../../events/bus';
import type { PluginRegistry } from '../../../core/plugins/registry/manager';
import type { IWorkspaceAnalysisCache } from '../cache';
import type { AnalysisCacheTierOptions, IWorkspaceFileAnalysisResult } from '../fileAnalysis';
import {
  analyzeWorkspacePipelineSourceFiles,
  type WorkspacePipelineFilesSource,
} from '../analysis/files';
import { preAnalyzeWorkspacePipelineFiles } from '../analysis/preAnalyze';

export async function preAnalyzeWorkspacePipelinePlugins(
  files: IDiscoveredFile[],
  workspaceRoot: string,
  registry: Pick<PluginRegistry, 'notifyPreAnalyze'>,
  discovery: Pick<FileDiscovery, 'readContent'>,
  signal?: AbortSignal,
  disabledPlugins: Set<string> = new Set(),
): Promise<void> {
  await preAnalyzeWorkspacePipelineFiles(
    files,
    workspaceRoot,
    {
      notifyPreAnalyze: async (v2Files, rootPath) => {
        await preAnalyzeCoreTreeSitterFiles(v2Files, rootPath);
        await registry.notifyPreAnalyze(v2Files, rootPath, undefined, disabledPlugins);
      },
      readContent: file => discovery.readContent(file),
    },
    signal,
  );
}

export function analyzeWorkspacePipelineFiles(
  cache: IWorkspaceAnalysisCache,
  discovery: FileDiscovery,
  eventBus: EventBus | undefined,
  registry: PluginRegistry,
  getFileStat: (filePath: string) => Promise<{ mtime: number; size: number } | null>,
  files: IDiscoveredFile[],
  workspaceRoot: string,
  onProgress?: (progress: { current: number; total: number; filePath: string }) => void,
  signal?: AbortSignal,
  cacheTiers?: AnalysisCacheTierOptions,
  pluginIds?: readonly string[],
  disabledPlugins: Set<string> = new Set(),
  options?: { forceAnalyze?: boolean },
): Promise<IWorkspaceFileAnalysisResult> {
  const source: WorkspacePipelineFilesSource = {
    _cache: cache,
    _discovery: discovery,
    _eventBus: eventBus,
    _getFileStat: getFileStat,
    _preAnalyzePlugins: (preAnalyzeFiles, rootPath, abortSignal) =>
      preAnalyzeWorkspacePipelinePlugins(
        preAnalyzeFiles,
        rootPath,
        registry,
        discovery,
        abortSignal,
        disabledPlugins,
      ),
    _registry: registry,
  };

  const args = [
    source,
    files,
    workspaceRoot,
    (message: string) => console.log(message),
    onProgress,
    signal,
    cacheTiers,
    pluginIds,
    disabledPlugins,
  ] as const;

  return options
    ? analyzeWorkspacePipelineSourceFiles(...args, options)
    : analyzeWorkspacePipelineSourceFiles(...args);
}
