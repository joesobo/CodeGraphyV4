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
  disabledPlugins: Set<string>;
  options: IndexCodeGraphyWorkspaceOptions;
  registry: CorePluginRegistry;
  workspaceRoot: string;
}) {
  return analyzeWorkspacePipelineFiles({
    analyzeFile: async (absolutePath, content, rootPath) =>
      input.registry.analyzeFileResult(
        absolutePath,
        content,
        rootPath,
        undefined,
        { disabledPlugins: input.disabledPlugins },
      ).then(result => result ?? ({
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
    preAnalyzeFiles: (files, rootPath, signal) =>
      preAnalyzeWorkspacePipelineFiles(
        files,
        rootPath,
        {
          notifyPreAnalyze: (preAnalyzeFiles, preAnalyzeRootPath) =>
            input.registry.notifyPreAnalyze(
              preAnalyzeFiles,
              preAnalyzeRootPath,
              undefined,
              input.disabledPlugins,
            ),
          readContent: file => input.discovery.readContent(file),
        },
        signal,
      ),
    readContent: file => input.discovery.readContent(file),
    signal: input.options.signal,
    workspaceRoot: input.workspaceRoot,
  });
}
