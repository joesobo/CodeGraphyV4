import {
  createWorkspacePluginAnalysisContext,
  type IDiscoveredFile,
  SYMBOLS_ANALYSIS_CACHE_TIER,
  throwIfWorkspaceAnalysisAborted,
} from '@codegraphy-dev/core';
import { createWorkspacePipelineAnalysisCacheTiers } from './cache/tiers';

interface CachedGraphWarmupRegistry {
  analyzeFileResultForPlugins?: (
    absolutePath: string,
    content: string,
    workspaceRoot: string,
    pluginIds: readonly string[],
    analysisContext: ReturnType<typeof createWorkspacePluginAnalysisContext>,
    options: { disabledPlugins: Set<string> },
  ) => Promise<unknown>;
  supportsFile?: (filePath: string) => boolean;
}

interface CachedGraphWarmupDiscovery {
  readContent(file: IDiscoveredFile): Promise<string>;
}

export interface CachedGraphAnalysisWarmupInput {
  analysisContext: ReturnType<typeof createWorkspacePluginAnalysisContext>;
  disabledPluginSnapshot: Set<string>;
  file: IDiscoveredFile;
  pluginIds: readonly string[];
  signal?: AbortSignal;
  workspaceRoot: string;
}

export interface CachedGraphAnalysisWarmupOptions {
  disabledPlugins: Set<string>;
  files: readonly IDiscoveredFile[];
  getActiveAnalysisPluginIds(
    disabledPluginSnapshot: Set<string>,
  ): readonly string[];
  nodeVisibility: Record<string, boolean>;
  registry: CachedGraphWarmupRegistry;
  signal?: AbortSignal;
  workspaceRoot: string;
}

export function isWorkspaceAnalysisAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

export function isMissingFileError(error: unknown): boolean {
  return error instanceof Error
    && 'code' in error
    && (error as { code?: unknown }).code === 'ENOENT';
}

const CACHED_GRAPH_ANALYSIS_WARMUP_IGNORED_SEGMENTS = new Set([
  '.codegraphy',
  '.git',
  '.stryker-tmp',
  '.turbo',
  '.worktrees',
  'coverage',
  'dist',
  'node_modules',
  'out',
  'reports',
]);

function isCachedGraphAnalysisWarmupCandidate(file: IDiscoveredFile): boolean {
  const segments = file.relativePath.replace(/\\/g, '/').split('/');
  return !segments.some(segment => CACHED_GRAPH_ANALYSIS_WARMUP_IGNORED_SEGMENTS.has(segment));
}

function selectMostRepresentedCachedGraphWarmupFile(
  files: readonly IDiscoveredFile[],
): IDiscoveredFile | undefined {
  const extensionStats = new Map<string, {
    count: number;
    file: IDiscoveredFile;
    firstIndex: number;
  }>();

  for (const [index, file] of files.entries()) {
    const extension = file.extension;
    const stats = extensionStats.get(extension);
    if (stats) {
      stats.count += 1;
      continue;
    }

    extensionStats.set(extension, {
      count: 1,
      file,
      firstIndex: index,
    });
  }

  return [...extensionStats.values()]
    .sort((left, right) => right.count - left.count || left.firstIndex - right.firstIndex)[0]
    ?.file;
}

function getSupportedCachedGraphAnalysisWarmupFiles(
  registry: CachedGraphWarmupRegistry,
  files: readonly IDiscoveredFile[],
): IDiscoveredFile[] {
  return files.filter(file =>
    registry.supportsFile?.(file.absolutePath)
    || registry.supportsFile?.(file.relativePath),
  );
}

function selectCachedGraphAnalysisWarmupFile(
  registry: CachedGraphWarmupRegistry,
  files: readonly IDiscoveredFile[],
): IDiscoveredFile | undefined {
  if (typeof registry.supportsFile !== 'function') {
    return files[0];
  }

  const supportedFiles = getSupportedCachedGraphAnalysisWarmupFiles(
    registry,
    files.filter(isCachedGraphAnalysisWarmupCandidate),
  );
  if (supportedFiles.length === 0) {
    return getSupportedCachedGraphAnalysisWarmupFiles(registry, files)[0] ?? files[0];
  }

  return selectMostRepresentedCachedGraphWarmupFile(supportedFiles);
}

export function createCachedGraphAnalysisWarmupInput(
  options: CachedGraphAnalysisWarmupOptions,
): CachedGraphAnalysisWarmupInput | undefined {
  if (typeof options.registry.analyzeFileResultForPlugins !== 'function') {
    return undefined;
  }

  const file = selectCachedGraphAnalysisWarmupFile(options.registry, options.files);
  if (!file) {
    return undefined;
  }

  const disabledPluginSnapshot = new Set(options.disabledPlugins);
  const pluginIds = options.getActiveAnalysisPluginIds(disabledPluginSnapshot);
  const cacheTiers = createWorkspacePipelineAnalysisCacheTiers(
    options.nodeVisibility,
    pluginIds,
  );

  return {
    analysisContext: createWorkspacePluginAnalysisContext(options.workspaceRoot, {
      features: {
        symbols: cacheTiers.active === undefined
          || cacheTiers.active.includes(SYMBOLS_ANALYSIS_CACHE_TIER),
      },
    }),
    disabledPluginSnapshot,
    file,
    pluginIds,
    signal: options.signal,
    workspaceRoot: options.workspaceRoot,
  };
}

export async function warmCachedGraphAnalysisFile(
  input: CachedGraphAnalysisWarmupInput,
  discovery: CachedGraphWarmupDiscovery,
  registry: CachedGraphWarmupRegistry,
): Promise<void> {
  if (typeof registry.analyzeFileResultForPlugins !== 'function') {
    return;
  }

  throwIfWorkspaceAnalysisAborted(input.signal);
  const content = await discovery.readContent(input.file);
  throwIfWorkspaceAnalysisAborted(input.signal);
  await registry.analyzeFileResultForPlugins(
    input.file.absolutePath,
    content,
    input.workspaceRoot,
    input.pluginIds,
    input.analysisContext,
    { disabledPlugins: input.disabledPluginSnapshot },
  );
}
