import type { IGraphData } from '../../../../shared/graph/contracts';
import type { WorkspacePipelineRefreshSource } from '../runtime/refresh';

type RefreshSourceBuildGraphData = WorkspacePipelineRefreshSource['_buildGraphData'];
type RefreshSourceBuildGraphDataFromAnalysis =
  WorkspacePipelineRefreshSource['_buildGraphDataFromAnalysis'];

export interface RefreshSourceFacade {
  _analyzeFiles: WorkspacePipelineRefreshSource['_analyzeFiles'];
  _buildGraphData(
    fileConnections: Parameters<RefreshSourceBuildGraphData>[0],
    workspaceRoot: string,
    showOrphans: boolean,
    disabledPlugins: Set<string>,
  ): IGraphData;
  _buildGraphDataFromAnalysis(
    fileAnalysis: Parameters<RefreshSourceBuildGraphDataFromAnalysis>[0],
    workspaceRoot: string,
    showOrphans: boolean,
    disabledPlugins: Set<string>,
  ): IGraphData;
  _lastDiscoveredDirectories: WorkspacePipelineRefreshSource['_lastDiscoveredDirectories'];
  _lastDiscoveredFiles: WorkspacePipelineRefreshSource['_lastDiscoveredFiles'];
  _lastFileAnalysis: WorkspacePipelineRefreshSource['_lastFileAnalysis'];
  _lastFileConnections: WorkspacePipelineRefreshSource['_lastFileConnections'];
  _lastGraphData: WorkspacePipelineRefreshSource['_lastGraphData'];
  _lastWorkspaceRoot: WorkspacePipelineRefreshSource['_lastWorkspaceRoot'];
  _patchGraphDataNodeMetrics: NonNullable<WorkspacePipelineRefreshSource['_patchGraphDataNodeMetrics']>;
  _preAnalyzePlugins: WorkspacePipelineRefreshSource['_preAnalyzePlugins'];
  _readAnalysisFiles: WorkspacePipelineRefreshSource['_readAnalysisFiles'];
  analyze: WorkspacePipelineRefreshSource['analyze'];
  invalidateWorkspaceFiles: WorkspacePipelineRefreshSource['invalidateWorkspaceFiles'];
}

export function createWorkspaceIndexRefreshSource(
  facade: RefreshSourceFacade,
  disabledPlugins: Set<string> = new Set(),
): WorkspacePipelineRefreshSource {
  const source = {
    _analyzeFiles: (
      files,
      root,
      progress,
      abortSignal,
      pluginIds,
      nextDisabledPlugins = disabledPlugins,
      options,
    ) => options
      ? facade._analyzeFiles(
          files,
          root,
          progress,
          abortSignal,
          pluginIds,
          nextDisabledPlugins,
          options,
        )
      : facade._analyzeFiles(
          files,
          root,
          progress,
          abortSignal,
          pluginIds,
          nextDisabledPlugins,
        ),
    _buildGraphData: (fileConnections, root, selectedPlugins) =>
      facade._buildGraphData(fileConnections, root, true, selectedPlugins),
    _buildGraphDataFromAnalysis: (fileAnalysis, root, selectedPlugins) =>
      facade._buildGraphDataFromAnalysis(fileAnalysis, root, true, selectedPlugins),
    _patchGraphDataNodeMetrics: (graphData, filePaths) =>
      facade._patchGraphDataNodeMetrics(graphData, filePaths),
    _preAnalyzePlugins: (files, root, abortSignal, nextDisabledPlugins = disabledPlugins) =>
      facade._preAnalyzePlugins(files, root, abortSignal, nextDisabledPlugins),
    _readAnalysisFiles: files => facade._readAnalysisFiles(files),
    analyze: (patterns, selectedPlugins, abortSignal, progress) =>
      facade.analyze(patterns, selectedPlugins, abortSignal, progress),
    invalidateWorkspaceFiles: (paths, options) =>
      options
        ? facade.invalidateWorkspaceFiles(paths, options)
        : facade.invalidateWorkspaceFiles(paths),
  } as WorkspacePipelineRefreshSource;

  Object.defineProperties(source, {
    _lastDiscoveredDirectories: {
      get: () => facade._lastDiscoveredDirectories,
      set: (directories: WorkspacePipelineRefreshSource['_lastDiscoveredDirectories']) => {
        facade._lastDiscoveredDirectories = directories;
      },
    },
    _lastDiscoveredFiles: {
      get: () => facade._lastDiscoveredFiles,
      set: (files: WorkspacePipelineRefreshSource['_lastDiscoveredFiles']) => {
        facade._lastDiscoveredFiles = files;
      },
    },
    _lastFileAnalysis: {
      get: () => facade._lastFileAnalysis,
      set: (fileAnalysis: WorkspacePipelineRefreshSource['_lastFileAnalysis']) => {
        facade._lastFileAnalysis = fileAnalysis;
      },
    },
    _lastFileConnections: {
      get: () => facade._lastFileConnections,
      set: (fileConnections: WorkspacePipelineRefreshSource['_lastFileConnections']) => {
        facade._lastFileConnections = fileConnections;
      },
    },
    _lastGraphData: {
      get: () => facade._lastGraphData,
      set: (graphData: WorkspacePipelineRefreshSource['_lastGraphData']) => {
        facade._lastGraphData = graphData;
      },
    },
    _lastWorkspaceRoot: {
      get: () => facade._lastWorkspaceRoot,
      set: (root: WorkspacePipelineRefreshSource['_lastWorkspaceRoot']) => {
        facade._lastWorkspaceRoot = root;
      },
    },
  });

  return source;
}
