import type { IDiscoveredFile } from '@codegraphy-dev/core';
import type { FileDiscovery } from '@codegraphy-dev/core';
import type { EventBus } from '../../../events/bus';
import type { PluginRegistry } from '../../../../core/plugins/registry/manager';
import type { IWorkspaceAnalysisCache } from '../../cache';
import type { AnalysisCacheTierOptions, IWorkspaceFileAnalysisResult } from '../../fileAnalysis';
import { preAnalyzeWorkspacePipelineFiles } from '../../analysis/preAnalyze';
import { analyzeWorkspacePipelineFiles } from '../../serviceAdapters';

export async function preAnalyzeWorkspacePipelinePlugins(
  files: IDiscoveredFile[],
  workspaceRoot: string,
  dependencies: {
    notifyPreAnalyze(
      files: Array<{ absolutePath: string; relativePath: string; content: string }>,
      workspaceRoot: string,
      analysisContext?: undefined,
      disabledPlugins?: Set<string>,
    ): Promise<void>;
    readContent(file: IDiscoveredFile): Promise<string>;
  },
  signal?: AbortSignal,
  disabledPlugins: Set<string> = new Set(),
): Promise<void> {
  await preAnalyzeWorkspacePipelineFiles(
    files,
    workspaceRoot,
    {
      notifyPreAnalyze: (analysisFiles, rootPath) =>
        dependencies.notifyPreAnalyze(
          analysisFiles,
          rootPath,
          undefined,
          disabledPlugins,
        ),
      readContent: file => dependencies.readContent(file),
    },
    signal,
  );
}

export async function analyzeWorkspacePipelineDiscoveredFiles(
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
  const args = [
    cache,
    discovery,
    eventBus,
    registry,
    getFileStat,
    files,
    workspaceRoot,
    onProgress,
    signal,
    cacheTiers,
    pluginIds,
    disabledPlugins,
  ] as const;

  return options
    ? analyzeWorkspacePipelineFiles(...args, options)
    : analyzeWorkspacePipelineFiles(...args);
}
