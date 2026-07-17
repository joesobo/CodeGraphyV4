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

export async function refreshWorkspaceIndexChangedFiles(
  source: WorkspaceIndexRefreshSource,
  dependencies: WorkspaceIndexRefreshDependencies,
): Promise<IGraphData> {
  const discoveredByRelativePath = mapDiscoveredWorkspaceIndexFilesByRelativePath(
    dependencies.discoveredFiles,
  );
  const changeSelection = selectDiscoveredWorkspaceIndexFileChanges(
    dependencies.workspaceRoot,
    dependencies.filePaths,
    discoveredByRelativePath,
  );
  const deletionSelection = invalidateDeletedWorkspaceIndexFiles(
    source,
    changeSelection.unmatchedFilePaths,
  );
  const deleteFilePaths = deletionSelection.deleteFilePaths;
  const changedFiles = changeSelection.files;

  if (deletionSelection.unmatchedFilePaths.length > 0) {
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
    return analyzeWorkspaceIndexFromRefresh(source, dependencies);
  }

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
    return buildGraphWithoutChangedFileAnalysis(source, dependencies, deleteFilePaths);
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

  persistChangedFilesCachePatch(dependencies, {
    deleteFilePaths,
    upsertFilePaths: filesToAnalyze.map(file => file.relativePath),
  });
  if (
    canPatchWorkspaceIndexRefreshGraphData(graphSnapshot, analysisResult, filesToAnalyze)
    && source._patchGraphDataNodeMetrics
  ) {
    const graphData = source._patchGraphDataNodeMetrics(
      source._lastGraphData,
      filesToAnalyze.map(file => file.relativePath),
    );
    source._lastGraphData = graphData;
    await persistMetricOnlyIndexMetadata(dependencies);
    return graphData;
  }

  const graphData = buildWorkspaceIndexGraphFromRefreshState(
    source,
    dependencies.workspaceRoot,
    dependencies.disabledPlugins,
  );
  await dependencies.persistIndexMetadata();

  return graphData;
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
