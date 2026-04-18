import type { IDiscoveredFile } from '../../../../core/discovery/contracts';
import type { FileDiscovery } from '../../../../core/discovery/file/service';
import type { EventBus } from '../../../../core/plugins/events/bus';
import type { PluginRegistry } from '../../../../core/plugins/registry/manager';
import type { IWorkspaceAnalysisCache } from '../../cache';
import type { IWorkspaceFileAnalysisResult } from '../../fileAnalysis';
import { preAnalyzeWorkspacePipelineFiles } from '../../analysis/preAnalyze';
import { analyzeWorkspacePipelineFiles } from '../../serviceAdapters';

export async function preAnalyzeWorkspacePipelinePlugins(
  files: IDiscoveredFile[],
  workspaceRoot: string,
  dependencies: {
    notifyPreAnalyze(
      files: Array<{ absolutePath: string; relativePath: string; content: string }>,
      workspaceRoot: string,
    ): Promise<void>;
    readContent(file: IDiscoveredFile): Promise<string>;
  },
  signal?: AbortSignal,
): Promise<void> {
  await preAnalyzeWorkspacePipelineFiles(files, workspaceRoot, dependencies, signal);
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
): Promise<IWorkspaceFileAnalysisResult> {
  return analyzeWorkspacePipelineFiles(
    cache,
    discovery,
    eventBus,
    registry,
    getFileStat,
    files,
    workspaceRoot,
    onProgress,
    signal,
  );
}
