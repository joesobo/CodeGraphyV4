import type { IGraphData } from '../../../graph/contracts';
import {
  mapDiscoveredWorkspaceIndexFilesByRelativePath,
  mergeDiscoveredWorkspaceIndexFiles,
  selectDiscoveredWorkspaceIndexFileChanges,
} from '../../changedFiles';
import type {
  WorkspaceIndexRefreshDependencies,
  WorkspaceIndexRefreshSource,
} from '../contracts';
import { buildWorkspaceIndexGraphFromRefreshState } from '../graph';
import {
  canPatchWorkspaceIndexRefreshGraphData,
  captureWorkspaceIndexRefreshGraphSnapshot,
} from '../snapshot/capture';
import {
  applyWorkspaceIndexAnalysisResult,
  retainWorkspaceIndexDiscoveredFileConnections,
} from '../state';
import { findAffectedWorkspaceIndexAnalysisDependents } from '../../workspace/changes';
import { invalidateDeletedWorkspaceIndexFiles } from './changedFileDeletion';
import {
  buildGraphWithoutChangedFileAnalysis,
  persistChangedFilesCachePatch,
  persistMetricOnlyIndexMetadata,
} from './changedFilePersistence';
import { WorkspaceIndexFullRefreshRequiredError } from '../fullRefreshRequired';

export async function refreshWorkspaceIndexChangedFiles(
  source: WorkspaceIndexRefreshSource,
  dependencies: WorkspaceIndexRefreshDependencies,
): Promise<IGraphData> {
  const structuralPatch = selectWorkspaceDirectoryChanges(
    source._lastDiscoveredDirectories,
    dependencies.discoveredDirectories ?? [],
  );
  const discoveredByRelativePath = mapDiscoveredWorkspaceIndexFilesByRelativePath(
    dependencies.discoveredFiles,
  );
  const changeSelection = selectDiscoveredWorkspaceIndexFileChanges(
    dependencies.workspaceRoot,
    dependencies.filePaths,
    discoveredByRelativePath,
  );
  const changedFiles = changeSelection.files;
  let deletionSelection = dependencies.fullRefreshFallback === 'reject'
    ? undefined
    : invalidateDeletedWorkspaceIndexFiles(source, changeSelection.unmatchedFilePaths);

  if (deletionSelection?.unmatchedFilePaths.length) {
    return analyzeWorkspaceIndexFromRefresh(source, dependencies);
  }

  const incrementalLifecycle = changedFiles.length > 0
    ? await dependencies.notifyFilesChanged(
        await source._readAnalysisFiles(changedFiles),
        dependencies.workspaceRoot,
        undefined,
        dependencies.disabledPlugins,
      )
    : { additionalFilePaths: [], requiresFullRefresh: false };

  if (incrementalLifecycle.requiresFullRefresh) {
    if (dependencies.fullRefreshFallback === 'reject') {
      throw new WorkspaceIndexFullRefreshRequiredError('plugin-request');
    }
    return analyzeWorkspaceIndexFromRefresh(source, dependencies);
  }

  deletionSelection ??= invalidateDeletedWorkspaceIndexFiles(
    source,
    changeSelection.unmatchedFilePaths,
  );
  const deleteFilePaths = deletionSelection.deleteFilePaths;
  const affectedDependents = findAffectedWorkspaceIndexAnalysisDependents({
    fileAnalysis: source._lastFileAnalysis,
    invalidatedFilePaths: [
      ...changedFiles.map(file => file.relativePath),
      ...deleteFilePaths,
      ...incrementalLifecycle.additionalFilePaths,
    ],
    workspaceRoot: dependencies.workspaceRoot,
  });
  const filesToAnalyze = mergeDiscoveredWorkspaceIndexFiles(
    changedFiles,
    [...incrementalLifecycle.additionalFilePaths, ...affectedDependents],
    discoveredByRelativePath,
  );
  source._lastDiscoveredDirectories = dependencies.discoveredDirectories ?? [];
  source._lastDiscoveredFiles = dependencies.discoveredFiles;
  source._lastWorkspaceRoot = dependencies.workspaceRoot;
  retainWorkspaceIndexDiscoveredFileConnections(source, dependencies.discoveredFiles);

  if (filesToAnalyze.length === 0) {
    return buildGraphWithoutChangedFileAnalysis(
      source,
      dependencies,
      deleteFilePaths,
      structuralPatch,
    );
  }

  const graphSnapshot = captureWorkspaceIndexRefreshGraphSnapshot(source, filesToAnalyze);
  source.invalidateWorkspaceFiles(
    filesToAnalyze.map((file) => file.absolutePath),
    { persist: false },
  );
  dependencies.onProgress?.({
    phase: 'Applying Changes',
    current: 0,
    total: filesToAnalyze.length,
  });

  const analysisResult = await source._analyzeFiles(
    filesToAnalyze,
    dependencies.workspaceRoot,
    progress => {
      dependencies.onProgress?.({
        phase: 'Applying Changes',
        current: progress.current,
        total: progress.total,
      });
    },
    dependencies.signal,
    undefined,
    dependencies.disabledPlugins,
  );

  applyWorkspaceIndexAnalysisResult(source, analysisResult);

  const canPatchMetrics = structuralPatch.deleteNodeIds.length === 0
    && structuralPatch.upsertNodeIds.length === 0
    && canPatchWorkspaceIndexRefreshGraphData(
      graphSnapshot,
      analysisResult,
      filesToAnalyze,
    ) && source._patchGraphDataNodeMetrics;
  const graphData = canPatchMetrics
    ? source._patchGraphDataNodeMetrics!(
        source._lastGraphData,
        filesToAnalyze.map(file => file.relativePath),
      )
    : buildWorkspaceIndexGraphFromRefreshState(
        source,
        dependencies.workspaceRoot,
        dependencies.disabledPlugins,
      );
  source._lastGraphData = graphData;
  await persistChangedFilesCachePatch(dependencies, {
    deleteFilePaths,
    deleteNodeIds: structuralPatch.deleteNodeIds,
    upsertFilePaths: filesToAnalyze.map(file => file.relativePath),
    upsertNodeIds: structuralPatch.upsertNodeIds,
    graph: graphData,
  });
  if (canPatchMetrics) {
    await persistMetricOnlyIndexMetadata(dependencies);
  } else {
    await dependencies.persistIndexMetadata(dependencies.filePaths);
  }

  return graphData;
}

function selectWorkspaceDirectoryChanges(
  previousDirectories: readonly string[],
  nextDirectories: readonly string[],
): { deleteNodeIds: string[]; upsertNodeIds: string[] } {
  const previous = new Set(previousDirectories);
  const next = new Set(nextDirectories);
  return {
    deleteNodeIds: [...previous].filter(directory => !next.has(directory)),
    upsertNodeIds: [...next].filter(directory => !previous.has(directory)),
  };
}

function analyzeWorkspaceIndexFromRefresh(
  source: WorkspaceIndexRefreshSource,
  dependencies: WorkspaceIndexRefreshDependencies,
): Promise<IGraphData> {
  return source.analyze(
    dependencies.filterPatterns,
    dependencies.disabledPlugins,
    dependencies.signal,
    progress => {
      dependencies.onProgress?.({
        ...progress,
        phase: progress.phase || 'Applying Changes',
      });
    },
  );
}
