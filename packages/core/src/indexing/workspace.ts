import * as fs from 'node:fs/promises';
import type { IGraphData, IPlugin } from '@codegraphy/plugin-api';
import { createMarkdownPlugin } from '@codegraphy/plugin-markdown';
import { createEmptyWorkspaceAnalysisCache, type IWorkspaceAnalysisCache } from '../analysis/cache';
import {
  analyzeWorkspacePipelineFiles,
} from '../analysis/workspaceFiles';
import {
  preAnalyzeWorkspacePipelineFiles,
} from '../analysis/workspacePreAnalyze';
import { DEFAULT_INCLUDE, DEFAULT_MAX_FILES } from '../discovery/file/defaults';
import { FileDiscovery } from '../discovery/file/service';
import type { IDiscoveredFile } from '../discovery/contracts';
import { buildWorkspacePipelineGraphFromAnalysis } from '../graph/build';
import { saveWorkspaceAnalysisDatabaseCache } from '../graphCache/database/storage';
import { getGraphCachePath, resolveWorkspaceRoot } from '../workspace/paths';
import { persistCodeGraphyWorkspaceIndexMetadata } from '../workspace/meta';
import {
  CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
  ensureCodeGraphyWorkspaceSettings,
  type CodeGraphyWorkspaceSettings,
} from '../workspace/settings';
import {
  createCodeGraphyWorkspacePluginSignature,
  createCodeGraphyWorkspaceSettingsSignature,
} from '../workspace/signatures';
import { createTreeSitterPlugin } from '../treeSitter/plugin';
import { CorePluginRegistry } from '../plugins/registry';

export interface IndexCodeGraphyWorkspaceOptions {
  workspaceRoot: string;
  plugins?: IPlugin[];
  settings?: CodeGraphyWorkspaceSettings;
  includeCorePlugins?: boolean;
  include?: string[];
  filterPatterns?: string[];
  disabledPluginFilterPatterns?: string[];
  disabledPlugins?: Iterable<string>;
  maxFiles?: number;
  respectGitignore?: boolean;
  showOrphans?: boolean;
  signal?: AbortSignal;
  onProgress?: (progress: { phase: string; current: number; total: number }) => void;
  logInfo?: (message: string) => void;
  warn?: (message: string) => void;
}

export interface IndexCodeGraphyWorkspaceResult {
  workspaceRoot: string;
  graphCachePath: string;
  graph: IGraphData;
  cache: IWorkspaceAnalysisCache;
  files: IDiscoveredFile[];
  directories: string[];
  limitReached: boolean;
  totalFound: number;
}

async function getFileStat(filePath: string): Promise<{ mtime: number; size: number } | null> {
  try {
    const stat = await fs.stat(filePath);
    return {
      mtime: stat.mtimeMs,
      size: stat.size,
    };
  } catch {
    return null;
  }
}

function shouldRegisterDefaultMarkdownPlugin(
  options: IndexCodeGraphyWorkspaceOptions,
  settings: CodeGraphyWorkspaceSettings,
): boolean {
  if (options.includeCorePlugins === false) {
    return false;
  }

  const providedPluginIds = new Set((options.plugins ?? []).map(plugin => plugin.id));
  return settings.plugins.some(plugin => plugin.package === CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME)
    && !providedPluginIds.has('codegraphy.markdown');
}

function createRegistry(
  options: IndexCodeGraphyWorkspaceOptions,
  settings: CodeGraphyWorkspaceSettings,
): CorePluginRegistry {
  const registry = new CorePluginRegistry();

  if (options.includeCorePlugins !== false) {
    registry.register(createTreeSitterPlugin(), { builtIn: true });
  }

  if (shouldRegisterDefaultMarkdownPlugin(options, settings)) {
    registry.register(createMarkdownPlugin(), {
      builtIn: true,
      sourcePackage: CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
    });
  }

  for (const plugin of options.plugins ?? []) {
    registry.register(plugin);
  }

  return registry;
}

function createEffectiveIndexSettings(
  workspaceRoot: string,
  options: IndexCodeGraphyWorkspaceOptions,
): CodeGraphyWorkspaceSettings {
  const workspaceSettings = options.settings ?? ensureCodeGraphyWorkspaceSettings(workspaceRoot);
  return {
    ...workspaceSettings,
    maxFiles: options.maxFiles ?? workspaceSettings.maxFiles,
    include: options.include ?? workspaceSettings.include,
    respectGitignore: options.respectGitignore ?? workspaceSettings.respectGitignore,
    showOrphans: options.showOrphans ?? workspaceSettings.showOrphans,
    filterPatterns: options.filterPatterns ?? workspaceSettings.filterPatterns,
    disabledPluginFilterPatterns: options.disabledPluginFilterPatterns
      ?? workspaceSettings.disabledPluginFilterPatterns,
  };
}

export async function indexCodeGraphyWorkspace(
  options: IndexCodeGraphyWorkspaceOptions,
): Promise<IndexCodeGraphyWorkspaceResult> {
  const workspaceRoot = resolveWorkspaceRoot(options.workspaceRoot);
  const discovery = new FileDiscovery();
  const cache = createEmptyWorkspaceAnalysisCache();
  const settings = createEffectiveIndexSettings(workspaceRoot, options);
  const registry = createRegistry(options, settings);
  const disabledPlugins = new Set(options.disabledPlugins ?? []);
  const disabledPluginPatterns = new Set(settings.disabledPluginFilterPatterns);
  const logInfo = options.logInfo ?? (() => undefined);
  const warn = options.warn ?? (() => undefined);

  await registry.initializeAll(workspaceRoot);

  const pluginFilterPatterns = registry
    .getPluginFilterPatterns(disabledPlugins)
    .filter(pattern => !disabledPluginPatterns.has(pattern));
  const discoveryResult = await discovery.discover({
    rootPath: workspaceRoot,
    include: settings.include.length > 0 ? settings.include : DEFAULT_INCLUDE,
    exclude: [
      ...new Set([
        ...pluginFilterPatterns,
        ...settings.filterPatterns,
      ]),
    ],
    maxFiles: settings.maxFiles ?? DEFAULT_MAX_FILES,
    respectGitignore: settings.respectGitignore,
    signal: options.signal,
  });

  if (discoveryResult.limitReached) {
    warn(
      `CodeGraphy: Found ${discoveryResult.totalFound}+ files, showing first ${settings.maxFiles}. ` +
      'Increase maxFiles in .codegraphy/settings.json to see more.',
    );
  }

  logInfo(`[CodeGraphy] Discovered ${discoveryResult.files.length} files in ${discoveryResult.durationMs}ms`);

  await preAnalyzeWorkspacePipelineFiles(
    discoveryResult.files,
    workspaceRoot,
    {
      notifyPreAnalyze: (files, rootPath) => registry.notifyPreAnalyze(files, rootPath),
      readContent: file => discovery.readContent(file),
    },
    options.signal,
  );

  const analysisResult = await analyzeWorkspacePipelineFiles({
    analyzeFile: async (absolutePath, content, rootPath) =>
      registry.analyzeFileResult(absolutePath, content, rootPath).then(result => result ?? ({
        filePath: absolutePath,
        relations: [],
      })),
    cache,
    files: discoveryResult.files,
    getFileStat,
    logInfo,
    onProgress: progress => options.onProgress?.({
      phase: 'Analyzing Files',
      current: progress.current,
      total: progress.total,
    }),
    readContent: file => discovery.readContent(file),
    signal: options.signal,
    workspaceRoot,
  });

  const graph = buildWorkspacePipelineGraphFromAnalysis({
    cacheFiles: cache.files,
    churnCounts: {},
    directoryPaths: discoveryResult.directories ?? [],
    disabledPlugins,
    fileAnalysis: analysisResult.fileAnalysis,
    getPluginForFile: absolutePath => registry.getPluginForFile(absolutePath),
    showOrphans: settings.showOrphans,
    workspaceRoot,
  });

  registry.notifyPostAnalyze(graph);
  registry.notifyWorkspaceReady(graph);
  saveWorkspaceAnalysisDatabaseCache(workspaceRoot, cache);
  persistCodeGraphyWorkspaceIndexMetadata(workspaceRoot, {
    pluginSignature: createCodeGraphyWorkspacePluginSignature(
      registry.list().map(info => info.plugin),
    ),
    settingsSignature: createCodeGraphyWorkspaceSettingsSignature(settings),
  });
  logInfo(`[CodeGraphy] Graph built: ${graph.nodes.length} nodes, ${graph.edges.length} edges`);

  return {
    workspaceRoot,
    graphCachePath: getGraphCachePath(workspaceRoot),
    graph,
    cache,
    files: discoveryResult.files,
    directories: discoveryResult.directories ?? [],
    limitReached: discoveryResult.limitReached,
    totalFound: discoveryResult.totalFound ?? discoveryResult.files.length,
  };
}
