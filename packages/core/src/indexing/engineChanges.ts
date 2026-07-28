import { stat } from 'node:fs/promises';
import path from 'node:path';
import { invalidateWorkspaceIndexEngineFiles } from './state';
import { mapDiscoveredWorkspaceIndexFilesByRelativePath, mergeDiscoveredWorkspaceIndexFiles, selectDiscoveredWorkspaceIndexFileChanges } from './changedFiles';
import type { IndexCodeGraphyWorkspaceResult } from './contracts';
import { analyzeWorkspaceEngineChangedFiles, applyWorkspaceEngineAnalysisResult, readAnalysisFiles } from './engineAnalysis';
import { buildWorkspaceEngineGraph, createWorkspaceEngineIndexResult, patchWorkspaceEngineCache } from './engineGraph';
import { assertWorkspaceEngineActive, type WorkspaceEngineRuntime } from './engineRuntime';
import { createWorkspaceEngineDisabledPlugins, discoverWorkspaceEngineFiles } from './engineSetup';
import {
  createWorkspaceIndexFileContentReader,
  findAffectedWorkspaceIndexAnalysisDependents,
  findChangedWorkspaceIndexFiles,
} from './workspace/changes';

async function unmatchedPathCanAffectIndex(
  runtime: WorkspaceEngineRuntime,
  filePath: string,
): Promise<boolean> {
  const { state, workspaceRoot } = runtime;
  if (state.discoveryResult?.limitReached) return true;
  const absolutePath = path.resolve(workspaceRoot, filePath);
  const relativePath = path.relative(workspaceRoot, absolutePath).split(path.sep).join('/');
  if (!relativePath || relativePath.startsWith('../')) return true;
  if (relativePath === '.codegraphy/settings.json' || path.basename(relativePath) === '.gitignore') {
    return true;
  }
  if (state.cache.files[relativePath]) return true;
  try {
    return !(await stat(absolutePath)).isFile();
  } catch {
    return true;
  }
}

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

  const unmatchedPathsWithIndexImpact = (
    await Promise.all(changes.unmatchedFilePaths.map(async filePath => (
      await unmatchedPathCanAffectIndex(runtime, filePath) ? filePath : undefined
    )))
  ).filter((filePath): filePath is string => filePath !== undefined);
  if (unmatchedPathsWithIndexImpact.length > 0) {
    invalidateWorkspaceIndexEngineFiles(state, workspaceRoot, unmatchedPathsWithIndexImpact);
    return fullIndex();
  }
  if (changes.files.length === 0) {
    const graph = buildWorkspaceEngineGraph(runtime, disabledPlugins);
    return {
      ...createWorkspaceEngineIndexResult(runtime, graph),
      indexing: {
        mode: 'incremental',
        analyzedFiles: 0,
        deletedFiles: 0,
        reusedFiles: state.discoveryResult!.files.length,
      },
    };
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
  const supersededFiles = await findChangedWorkspaceIndexFiles({
    cache: state.cache,
    files,
    readContent: createWorkspaceIndexFileContentReader(runtime.discovery),
  });
  if (supersededFiles.length > 0) {
    return applyWorkspaceEngineChangedFiles(
      runtime,
      supersededFiles.map(file => file.absolutePath),
      fullIndex,
    );
  }
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
