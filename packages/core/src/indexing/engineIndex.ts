import { analyzeWorkspaceIndexFiles } from './analysis';
import type { IndexCodeGraphyWorkspaceResult } from './contracts';
import { buildWorkspaceEngineGraph, createWorkspaceEngineIndexResult, replaceWorkspaceEngineCache } from './engineGraph';
import { assertWorkspaceEngineActive, type WorkspaceEngineRuntime } from './engineRuntime';
import { createWorkspaceEngineDisabledPlugins, discoverWorkspaceEngineFiles, initializeWorkspaceEngine } from './engineSetup';
import { createWorkspaceIndexFileContentReader, findChangedWorkspaceIndexFiles } from './workspace/changes';
import { isRetainedWorkspaceIndexCachePath } from './discovery';

function sameDiscoveredFiles(
  before: readonly { relativePath: string }[],
  after: readonly { relativePath: string }[],
): boolean {
  if (before.length !== after.length) return false;
  const beforePaths = new Set(before.map(file => file.relativePath));
  return after.every(file => beforePaths.has(file.relativePath));
}

export async function indexWorkspaceEngine(
  runtime: WorkspaceEngineRuntime,
): Promise<IndexCodeGraphyWorkspaceResult> {
  assertWorkspaceEngineActive(runtime);
  const { discovery, options, state, workspaceRoot } = runtime;
  await initializeWorkspaceEngine(runtime);
  assertWorkspaceEngineActive(runtime);
  const disabledPlugins = createWorkspaceEngineDisabledPlugins(runtime);
  await discoverWorkspaceEngineFiles(runtime);
  assertWorkspaceEngineActive(runtime);
  const cacheFilePaths = new Set(state.discoveryResult!.cacheFilePaths);
  for (const filePath of Object.keys(state.cache.files)) {
    if (!isRetainedWorkspaceIndexCachePath(
      filePath,
      cacheFilePaths,
      state.discoveryResult!.cachePathPrefixes,
    )) {
      delete state.cache.files[filePath];
    }
  }
  const analysis = await analyzeWorkspaceIndexFiles({
    cache: state.cache,
    discovery,
    discoveryResult: state.discoveryResult!,
    disabledPlugins,
    options,
    registry: state.registry!,
    workspaceRoot,
  });
  assertWorkspaceEngineActive(runtime);
  const analyzedFiles = [...state.discoveryResult!.files];
  let graph: ReturnType<typeof buildWorkspaceEngineGraph> | undefined;
  const committed = await replaceWorkspaceEngineCache(runtime, async () => {
    assertWorkspaceEngineActive(runtime);
    await discoverWorkspaceEngineFiles(runtime);
    assertWorkspaceEngineActive(runtime);
    if (!sameDiscoveredFiles(analyzedFiles, state.discoveryResult!.files)) return false;
    const supersededFiles = await findChangedWorkspaceIndexFiles({
      cache: state.cache,
      files: state.discoveryResult!.files,
      readContent: createWorkspaceIndexFileContentReader(discovery),
    });
    assertWorkspaceEngineActive(runtime);
    if (supersededFiles.length > 0) return false;
    state.fileAnalysis = analysis.fileAnalysis;
    state.fileConnections = analysis.fileConnections;
    graph = buildWorkspaceEngineGraph(runtime, disabledPlugins);
    state.registry!.notifyPostAnalyze(graph, disabledPlugins);
    return true;
  });
  if (!committed) return indexWorkspaceEngine(runtime);
  if (!graph) throw new Error('Workspace Graph Cache commit completed without a Graph');
  state.registry!.notifyWorkspaceReady(graph, disabledPlugins);
  options.logInfo?.(`[CodeGraphy] Graph built: ${graph.nodes.length} nodes, ${graph.edges.length} edges`);
  return createWorkspaceEngineIndexResult(runtime, graph);
}
