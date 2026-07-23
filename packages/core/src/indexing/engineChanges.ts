import { invalidateWorkspaceIndexEngineFiles } from './state';
import { mapDiscoveredWorkspaceIndexFilesByRelativePath, mergeDiscoveredWorkspaceIndexFiles, selectDiscoveredWorkspaceIndexFileChanges } from './changedFiles';
import type { IndexCodeGraphyWorkspaceResult } from './contracts';
import { analyzeWorkspaceEngineChangedFiles, applyWorkspaceEngineAnalysisResult, readAnalysisFiles } from './engineAnalysis';
import { buildWorkspaceEngineGraph, createWorkspaceEngineIndexResult, patchWorkspaceEngineCache } from './engineGraph';
import { assertWorkspaceEngineActive, type WorkspaceEngineRuntime } from './engineRuntime';
import { createWorkspaceEngineDisabledPlugins, discoverWorkspaceEngineFiles } from './engineSetup';
import { findAffectedWorkspaceIndexAnalysisDependents } from './workspace/changes';

export async function applyWorkspaceEngineChangedFiles(
  runtime: WorkspaceEngineRuntime,
  filePaths: readonly string[],
  fullIndex: () => Promise<IndexCodeGraphyWorkspaceResult>,
): Promise<IndexCodeGraphyWorkspaceResult> {
  assertWorkspaceEngineActive(runtime);
  const { state, workspaceRoot } = runtime;
  const disabledPlugins = createWorkspaceEngineDisabledPlugins(runtime);
  await discoverWorkspaceEngineFiles(runtime);
  assertWorkspaceEngineActive(runtime);
  const discoveredByPath = mapDiscoveredWorkspaceIndexFilesByRelativePath(state.discoveryResult!.files);
  const changes = selectDiscoveredWorkspaceIndexFileChanges(workspaceRoot, filePaths, discoveredByPath);

  if (changes.unmatchedFilePaths.length > 0) {
    invalidateWorkspaceIndexEngineFiles(state, workspaceRoot, changes.unmatchedFilePaths);
    return fullIndex();
  }

  const changedFiles = await readAnalysisFiles(runtime, changes.files);
  assertWorkspaceEngineActive(runtime);
  const pluginChanges = await state.registry!.notifyFilesChanged(
    changedFiles,
    workspaceRoot,
    undefined,
    disabledPlugins,
  );
  assertWorkspaceEngineActive(runtime);
  if (pluginChanges.requiresFullRefresh) return fullIndex();

  const affectedDependents = findAffectedWorkspaceIndexAnalysisDependents({
    fileAnalysis: state.fileAnalysis,
    invalidatedFilePaths: [
      ...changes.files.map(file => file.relativePath),
      ...pluginChanges.additionalFilePaths,
    ],
    workspaceRoot,
  });
  const files = mergeDiscoveredWorkspaceIndexFiles(
    changes.files,
    [...pluginChanges.additionalFilePaths, ...affectedDependents],
    discoveredByPath,
  );
  invalidateWorkspaceIndexEngineFiles(state, workspaceRoot, files.map(file => file.absolutePath));
  const analysis = await analyzeWorkspaceEngineChangedFiles(runtime, files, disabledPlugins);
  assertWorkspaceEngineActive(runtime);
  applyWorkspaceEngineAnalysisResult(state, analysis);
  const graph = buildWorkspaceEngineGraph(runtime, disabledPlugins);
  state.registry!.notifyPostAnalyze(graph, disabledPlugins);
  patchWorkspaceEngineCache(runtime, files.map(file => file.relativePath));
  return {
    ...createWorkspaceEngineIndexResult(runtime, graph),
    indexing: {
      mode: 'incremental',
      analyzedFiles: files.length,
      deletedFiles: 0,
      reusedFiles: Math.max(0, state.discoveryResult!.files.length - files.length),
    },
  };
}
