import type { IWorkspaceAnalysisCache } from '../analysis/cache';
import { analyzeWorkspacePipelineFiles } from '../analysis/workspaceFiles';
import { preAnalyzeWorkspacePipelineFiles } from '../analysis/workspacePreAnalyze';
import type { IDiscoveryResult } from '../discovery/contracts';
import type { FileDiscovery } from '../discovery/file/service';
import type { CorePluginRegistry } from '../plugins/registry';
import type { IndexCodeGraphyWorkspaceOptions } from './contracts';
import { getFileStat } from './fileStat';

export async function analyzeWorkspaceIndexFiles(input: {
  cache: IWorkspaceAnalysisCache;
  discovery: FileDiscovery;
  discoveryResult: IDiscoveryResult;
  options: IndexCodeGraphyWorkspaceOptions;
  registry: CorePluginRegistry;
  workspaceRoot: string;
}) {
  await preAnalyzeWorkspacePipelineFiles(
    input.discoveryResult.files,
    input.workspaceRoot,
    {
      notifyPreAnalyze: (files, rootPath) => input.registry.notifyPreAnalyze(files, rootPath),
      readContent: file => input.discovery.readContent(file),
    },
    input.options.signal,
  );

  return analyzeWorkspacePipelineFiles({
    analyzeFile: async (absolutePath, content, rootPath) =>
      input.registry.analyzeFileResult(absolutePath, content, rootPath).then(result => result ?? ({
        filePath: absolutePath,
        relations: [],
      })),
    cache: input.cache,
    files: input.discoveryResult.files,
    getFileStat,
    logInfo: input.options.logInfo ?? (() => undefined),
    onProgress: progress => input.options.onProgress?.({
      phase: 'Analyzing Files',
      current: progress.current,
      total: progress.total,
    }),
    readContent: file => input.discovery.readContent(file),
    signal: input.options.signal,
    workspaceRoot: input.workspaceRoot,
  });
}
