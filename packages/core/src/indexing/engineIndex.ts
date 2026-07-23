import { analyzeWorkspaceIndexFiles } from './analysis';
import type { IndexCodeGraphyWorkspaceResult } from './contracts';
import { buildWorkspaceEngineGraph, createWorkspaceEngineIndexResult, persistWorkspaceEngine } from './engineGraph';
import { assertWorkspaceEngineActive, type WorkspaceEngineRuntime } from './engineRuntime';
import { createWorkspaceEngineDisabledPlugins, discoverWorkspaceEngineFiles, initializeWorkspaceEngine } from './engineSetup';

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
  state.fileAnalysis = analysis.fileAnalysis;
  state.fileConnections = analysis.fileConnections;
  const graph = buildWorkspaceEngineGraph(runtime, disabledPlugins);
  state.registry!.notifyPostAnalyze(graph, disabledPlugins);
  state.registry!.notifyWorkspaceReady(graph, disabledPlugins);
  persistWorkspaceEngine(runtime);
  options.logInfo?.(`[CodeGraphy] Graph built: ${graph.nodes.length} nodes, ${graph.edges.length} edges`);
  return createWorkspaceEngineIndexResult(runtime, graph);
}
