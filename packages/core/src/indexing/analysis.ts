import type { IWorkspaceAnalysisCache } from '../analysis/cache';
import { analyzeWorkspacePipelineFiles } from '../analysis/workspaceFiles';
import { preAnalyzeWorkspacePipelineFiles } from '../analysis/workspacePreAnalyze';
import type { IDiscoveryResult } from '../discovery/contracts';
import type { FileDiscovery } from '../discovery/file/service';
import type { CorePluginRegistry } from '../plugins/registry';
import { preAnalyzeCoreTreeSitterFiles } from '../treeSitter/core';
import type { IndexCodeGraphyWorkspaceOptions } from './contracts';
import { getFileStat } from './fileStat';
import type { WorkspaceIndexFileContentReader } from './workspace/changes';
import { createWorkspaceIndexAnalysisCacheTiers } from '../analysis/fileAnalysis';

function createCachedWorkspaceFileContentReader(
  discovery: FileDiscovery,
): (file: IDiscoveryResult['files'][number]) => Promise<string> {
  const contentByRelativePath = new Map<string, Promise<string>>();

  return (file) => {
    const cached = contentByRelativePath.get(file.relativePath);
    if (cached) {
      return cached;
    }

    const content = discovery.readContent(file);
    contentByRelativePath.set(file.relativePath, content);
    return content;
  };
}

function pluginPreAnalyzesFile(
  registry: CorePluginRegistry,
  relativePath: string,
): boolean {
  const lowercasePath = relativePath.toLowerCase();
  return registry.list().some(({ plugin }) => (
    plugin.onPreAnalyze !== undefined
    && (
      plugin.supportedExtensions.includes('*')
      || plugin.supportedExtensions.some(extension => lowercasePath.endsWith(extension.toLowerCase()))
    )
  ));
}

function selectWorkspaceIndexPreAnalysisFiles(
  input: {
    options: Pick<IndexCodeGraphyWorkspaceOptions, 'includeCorePlugins'>;
    registry: CorePluginRegistry;
  },
  files: IDiscoveryResult['files'],
): IDiscoveryResult['files'] {
  return files.filter(file => (
    (input.options.includeCorePlugins !== false && file.extension === '.cs')
    || pluginPreAnalyzesFile(input.registry, file.relativePath)
  ));
}

export async function analyzeWorkspaceIndexFiles(input: {
  cache: IWorkspaceAnalysisCache;
  discovery: FileDiscovery;
  discoveryResult: IDiscoveryResult;
  disabledPlugins: Set<string>;
  options: IndexCodeGraphyWorkspaceOptions;
  registry: CorePluginRegistry;
  readContent?: WorkspaceIndexFileContentReader;
  workspaceRoot: string;
}) {
  const readContent = input.readContent ?? createCachedWorkspaceFileContentReader(input.discovery);
  const activePluginIds = input.registry.list()
    .map(({ plugin }) => plugin.id)
    .filter(pluginId => !input.disabledPlugins.has(pluginId));
  const cacheTiers = createWorkspaceIndexAnalysisCacheTiers(
    activePluginIds,
  );

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
    cacheTiers,
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
        selectWorkspaceIndexPreAnalysisFiles(input, files),
        rootPath,
        {
          notifyPreAnalyze: async (preAnalyzeFiles, preAnalyzeRootPath) => {
            await preAnalyzeCoreTreeSitterFiles(preAnalyzeFiles, preAnalyzeRootPath);
            await input.registry.notifyPreAnalyze(
              preAnalyzeFiles,
              preAnalyzeRootPath,
              undefined,
              input.disabledPlugins,
            );
          },
          readContent,
        },
        signal,
      ),
    readContent,
    signal: input.options.signal,
    workspaceRoot: input.workspaceRoot,
  });
}
