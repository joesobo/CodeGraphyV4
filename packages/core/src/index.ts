export { CODEGRAPHY_CORE_PACKAGE_NAME } from './packageIdentity';
export type { CommandExecutionResult } from './cli/command';
export { runCliCommand } from './cli/command';
export type { CliCommand, CliCommandName, PluginsCommandAction } from './cli/parse';
export { parseCliCommand } from './cli/parse';
export type {
  DiagnosticContextValue,
  DiagnosticEvent,
  DiagnosticEventInput,
  DiagnosticEventSink,
} from './diagnostics/events';
export {
  collectDiagnosticEvents,
  createDiagnosticEvent,
  formatDiagnosticEventLine,
} from './diagnostics/events';
export type {
  PerfMetricContext,
  PerfMetricDiagnosticEvent,
  PerfMetricListener,
  PerfMetricName,
  PerfMetricSubscription,
  PerfMetricUnit,
  PerfScenario,
} from './diagnostics/perfMetrics';
export {
  emitPerfMetric,
  onPerfMetric,
  perfMetricContextSchema,
  perfMetricDiagnosticEventSchema,
  perfMetricNameSchema,
  perfMetricUnitSchema,
  perfScenarioSchema,
} from './diagnostics/perfMetrics';
export { runIndexCommand } from './cli/index/command';
export { runPluginsCommand } from './cli/plugins/command';
export { runSetupCommand } from './cli/setup/command';
export { runStatusCommand } from './cli/status/command';
export {
  createWorkspaceIndexEngineState,
  getWorkspaceIndexEngineRelativePath,
  invalidateWorkspaceIndexEngineFiles,
  removeInvalidatedWorkspaceIndexDirectories,
} from './indexing/state';
export type { WorkspaceIndexEngineState } from './indexing/state';
export type {
  ICachedWorkspaceFile,
  IWorkspaceAnalysisCache,
} from './analysis/cache';
export {
  createEmptyWorkspaceAnalysisCache,
  loadWorkspaceAnalysisCache,
  saveWorkspaceAnalysisCache,
  WORKSPACE_ANALYSIS_CACHE_KEY,
  WORKSPACE_ANALYSIS_CACHE_VERSION,
} from './analysis/cache';
export type { IProjectedConnection } from './analysis/projectedConnection';
export {
  createWorkspaceAnalysisAbortError,
  throwIfWorkspaceAnalysisAborted,
} from './analysis/abort';
export {
  projectConnectionMapFromFileAnalysis,
  projectProjectedConnectionsFromFileAnalysis,
} from './analysis/projection';
export type {
  IWorkspaceFileAnalysisOptions,
  IWorkspaceFileAnalysisResult,
  IWorkspaceFileProcessedPayload,
  AnalysisCacheTier,
  AnalysisCacheTierOptions,
} from './analysis/fileAnalysis';
export {
  analyzeWorkspaceFiles,
  BASELINE_ANALYSIS_CACHE_TIER,
  SYMBOLS_ANALYSIS_CACHE_TIER,
  createWorkspaceIndexAnalysisCacheTiers,
  createPluginAnalysisCacheTier,
  hasRequiredAnalysisCacheTiers,
  isAnalysisCacheTier,
  markAnalysisCacheTiers,
  projectAnalysisForCacheTiers,
  readAnalysisCacheTiers,
  requiresSymbolAnalysisCacheTier,
  sortAnalysisCacheTiers,
} from './analysis/fileAnalysis';
export {
  analyzeWorkspacePipelineFiles,
  analyzeWorkspacePipelineSourceFiles,
} from './analysis/workspaceFiles';
export type {
  WorkspacePipelineFilesDependencies,
  WorkspacePipelineFilesSource,
} from './analysis/workspaceFiles';
export {
  analyzeWorkspaceWithAnalyzer,
} from './analysis/workspaceAnalyze';
export type {
  WorkspacePipelineAnalysisDependencies,
  WorkspacePipelineAnalysisSource,
  WorkspacePipelineEventBus,
} from './analysis/workspaceAnalyze';
export {
  discoverWorkspacePipelineFiles,
  formatWorkspacePipelineLimitReachedMessage,
} from './analysis/workspaceDiscovery';
export type {
  WorkspacePipelineDiscoveryConfig,
  WorkspacePipelineDiscoveryDependencies,
  WorkspacePipelineDiscoveryResult,
} from './analysis/workspaceDiscovery';
export {
  preAnalyzeWorkspacePipelineFiles,
} from './analysis/workspacePreAnalyze';
export type { WorkspacePipelinePreAnalyzeDependencies } from './analysis/workspacePreAnalyze';
export {
  clearWorkspacePipelineCache,
  rebuildWorkspacePipelineGraph,
  rebuildWorkspacePipelineGraphForSource,
} from './analysis/workspaceState';
export type {
  WorkspacePipelineRebuildDependencies,
  WorkspacePipelineRebuildSource,
} from './analysis/workspaceState';
export type {
  IDiscoveredFile,
  IDiscoveryOptions,
  IDiscoveryResult,
} from './discovery/contracts';
export { createAbortError, throwIfAborted } from './discovery/abort';
export { FileDiscovery } from './discovery/file/service';
export {
  DEFAULT_EXCLUDE,
  matchesAnyPattern,
  normalizeDiscoveryPath,
  shouldSkipKnownDirectory,
} from './discovery/pathMatching';
export {
  DEFAULT_DIRECTION_COLOR,
  DEFAULT_FOLDER_NODE_COLOR,
  DEFAULT_NODE_COLOR,
  DEFAULT_PACKAGE_NODE_COLOR,
  FILE_TYPE_COLORS,
  getFileColor,
  normalizeHexColor,
} from './fileColors';
export type { WorkspaceAnalysisDatabaseSnapshot } from './graphCache/database/storage';
export {
  clearWorkspaceAnalysisDatabaseCache,
  getWorkspaceAnalysisDatabasePath,
  loadWorkspaceAnalysisDatabaseCache,
  loadWorkspaceAnalysisDatabaseCacheAsync,
  patchWorkspaceAnalysisDatabaseCache,
  readWorkspaceAnalysisDatabaseSnapshot,
  saveWorkspaceAnalysisDatabaseCache,
  saveWorkspaceAnalysisDatabaseCacheAsync,
} from './graphCache/database/storage';
export type {
  CoreEdgeKind,
  CoreNodeType,
  GraphEdgeKind,
  GraphMetadata,
  GraphMetadataValue,
  GraphNodeShape2D,
  GraphNodeShape3D,
  IGraphData,
  IGraphEdge,
  IGraphEdgeSource,
  IGraphNode,
  IGraphNodeRange,
  IGraphNodeSymbolMetadata,
  NodeType,
} from './graph/contracts';
export {
  buildWorkspaceGraphData,
  buildWorkspaceGraphDataFromAnalysis,
} from './graph/data';
export type {
  IWorkspaceGraphAnalysisDataOptions,
  IWorkspaceGraphDataOptions,
} from './graph/data';
export {
  createGraphEdgeId,
  getGraphEdgeIdSuffix,
  replaceGraphEdgeIdEndpoints,
} from './graph/edgeIdentity';
export { createEdgeSource, createQualifiedSourceId } from './graph/edgeSources';
export { resolveEdgeSourceIdentity } from './graph/edgeSources/identity';
export { getConnectionTargetId } from './graph/edgeTargets';
export { buildWorkspaceGraphEdges } from './graph/edges';
export type {
  IWorkspaceGraphEdgeBuildResult,
  IWorkspaceGraphEdgesOptions,
} from './graph/edges';
export { buildWorkspaceGraphNodes } from './graph/nodes';
export type { IWorkspaceGraphNodesOptions } from './graph/nodes';
export {
  getExternalPackageLabelFromNodeId,
  getExternalPackageNodeId,
  isExternalPackageNodeId,
} from './graph/packageSpecifiers/nodeId';
export { isExternalPackageSpecifier } from './graph/packageSpecifiers/match';
export { getExternalPackageName } from './graph/packageSpecifiers/name';
export {
  buildWorkspacePipelineGraph,
  buildWorkspacePipelineGraphForSource,
  buildWorkspacePipelineGraphFromAnalysis,
} from './graph/build';
export type {
  WorkspacePipelineGraphAnalysisDependencies,
  WorkspacePipelineGraphDependencies,
  WorkspacePipelineGraphSource,
} from './graph/build';
export { createCanonicalSymbolIds } from './graph/symbolIds';
export { createContainsEdge, createSymbolNode } from './graph/symbolNodes';
export { createSymbolRelationEdges, hasSymbolEndpoint } from './graph/symbolRelations';
export { buildSymbolNodesAndEdges, projectFileAnalysisConnections } from './graph/symbols';
export { normalizeSymbolKind, toRepoRelativeGraphPath } from './graph/symbolPaths';
export type {
  GraphCacheState,
  GraphCacheStatus,
  GraphCacheStatusDependencies,
} from './graphCache/status';
export { readGraphCacheStatus } from './graphCache/status';
export {
  createCodeGraphyWorkspaceEngine,
  indexCodeGraphyWorkspace,
  refreshWorkspaceIndexAnalysisScope,
  refreshWorkspaceIndexChangedFiles,
  refreshWorkspaceIndexPluginFiles,
} from './indexing/workspace';
export type {
  CodeGraphyWorkspaceEngine,
  IndexCodeGraphyWorkspaceOptions,
  IndexCodeGraphyWorkspacePlugin,
  IndexCodeGraphyWorkspacePluginEntry,
  IndexCodeGraphyWorkspaceResult,
  WorkspaceIndexAnalysisScopeRefreshDependencies,
  WorkspaceIndexPluginRefreshDependencies,
  WorkspaceIndexRefreshDependencies,
  WorkspaceIndexRefreshSource,
} from './indexing/workspace';
export {
  CORE_PLUGIN_API_VERSION,
  CorePluginRegistry,
} from './plugins/registry';
export type { CorePluginInfo } from './plugins/registry';
export {
  buildWorkspaceIndexPluginStatuses,
  countWorkspaceIndexPluginConnections,
  buildRegisteredWorkspaceIndexPluginStatus,
  buildUnregisteredInstalledWorkspaceIndexPluginStatus,
  getRegisteredWorkspaceIndexPluginPackageNames,
  getWorkspaceIndexPluginMatchingFiles,
  getWorkspaceIndexPluginNameForFile,
  getWorkspaceIndexPluginStatuses,
  isUserFacingWorkspaceIndexPlugin,
  resolveWorkspaceIndexPluginNameForFile,
  supportsWorkspaceIndexPluginExtension,
} from './plugins/status';
export type {
  WorkspaceIndexPluginStatus,
  WorkspaceIndexPluginStatusDependencies,
  WorkspaceIndexPluginStatusOptions,
} from './plugins/status';
export type {
  CoreGraphViewContributionEntry,
  CoreGraphViewContributionSet,
  CorePluginAccessCheck,
  CorePluginAccessContext,
} from './plugins/access/checks';
export {
  createEmptyGraphViewContributionSet,
  resolvePluginAccess,
} from './plugins/access/checks';
export {
  createDisabledPluginSet,
  createPluginActivityState,
} from './plugins/activityState/model';
export type {
  CreatePluginActivityStateOptions,
  PluginActivityState,
} from './plugins/activityState/model';
export { createWorkspacePluginDataHost } from './plugins/data/host';
export type {
  LoadedCodeGraphyWorkspacePluginPackage,
  LoadCodeGraphyWorkspacePluginPackagesOptions,
} from './plugins/packageRuntime';
export { loadCodeGraphyWorkspacePluginPackages } from './plugins/packageRuntime';
export type {
  CodeGraphyPluginDisclosure,
  CodeGraphyPluginPackageManifest,
} from './plugins/packageManifest';
export { parseCodeGraphyPluginPackageManifest } from './plugins/packageManifest';
export type {
  CodeGraphyWorkspacePluginIndexingPlan,
  CodeGraphyWorkspacePluginSettingUpdateIndexingPlan,
  CodeGraphyWorkspacePluginSettingUpdatePlanOptions,
  CodeGraphyWorkspacePluginToggleOptions,
  CodeGraphyWorkspacePluginTogglePlan,
  CodeGraphyInstalledPluginCache,
  CodeGraphyInstalledPluginRecord,
  CodeGraphyUserStateOptions,
  LinkCodeGraphyInstalledPluginPackageOptions,
  RegisterCodeGraphyInstalledPluginOptions,
} from './plugins/installedCache';
export {
  createCodeGraphyWorkspacePluginSettingUpdateIndexingPlan,
  createCodeGraphyWorkspacePluginTogglePlan,
  createBundledMarkdownInstalledPluginRecord,
  disableCodeGraphyWorkspacePlugin,
  enableCodeGraphyWorkspacePlugin,
  getCodeGraphyUserDirectoryPath,
  getCodeGraphyUserSettingsPath,
  getInstalledPluginsCachePath,
  linkCodeGraphyInstalledPluginPackage,
  readCodeGraphyInstalledPluginCache,
  registerCodeGraphyInstalledPlugin,
  updateCodeGraphyWorkspacePluginSelection,
  writeCodeGraphyInstalledPluginCache,
} from './plugins/installedCache';
export { loadBundledMarkdownPlugin } from './plugins/markdown/runtime';
export { createWorkspacePluginAnalysisContext } from './plugins/context/workspace';
export { withWorkspacePluginAnalysisOptions } from './plugins/context/workspace';
export { initializeAll, initializePlugin } from './plugins/lifecycle/initialize';
export type { ILifecyclePluginInfo } from './plugins/lifecycle/contracts';
export { notifyGraphRebuild, notifyPostAnalyze, notifyPreAnalyze } from './plugins/lifecycle/notify/analysis';
export { notifyFilesChanged } from './plugins/lifecycle/notify/filesChanged';
export type { IPluginFilesChangedResult } from './plugins/lifecycle/notify/filesChanged';
export { getFileExtension, normalizePluginExtension } from './plugins/routing/fileExtensions';
export { analyzeFile, analyzeFileResult } from './plugins/routing/router/analyze';
export type {
  AnalyzeFileResultOptions,
  CoreFileAnalysisResultProvider,
} from './plugins/routing/router/analyze';
export {
  getPluginForFile,
  getPluginsForExtension,
  getPluginsForFile,
  getSupportedExtensions,
  supportsFile,
} from './plugins/routing/router/lookups';
export type { IRoutablePluginInfo } from './plugins/routing/router/lookups';
export { getRelationKey } from './plugins/routing/router/results/keys';
export {
  createEmptyFileAnalysisResult,
  mergeById,
  mergeFileAnalysisResults,
  mergeRelations,
} from './plugins/routing/router/results/merge';
export {
  toProjectedConnectionsFromFileAnalysis,
  withPluginProvenance,
} from './plugins/routing/router/results/project';
export {
  analyzeFileWithCoreTreeSitter,
  listCoreTreeSitterEdgeTypeCapabilities,
  listCoreTreeSitterGraphScopeCapabilities,
  preAnalyzeCoreTreeSitterFiles,
} from './treeSitter/core';
export { analyzeFileWithTreeSitter } from './treeSitter/runtime/analyze';
export { preAnalyzeCSharpTreeSitterFiles } from './treeSitter/runtime/csharpIndex';
export {
  TREE_SITTER_SOURCE_IDS,
  TREE_SITTER_SUPPORTED_EXTENSIONS,
} from './treeSitter/runtime/languages';
export { resolveTreeSitterImportPath } from './treeSitter/runtime/resolve';
export {
  treeSitterPathExists,
  treeSitterPathIsDirectory,
  treeSitterPathIsFile,
  treeSitterReadDirectory,
  treeSitterReadTextFile,
  withTreeSitterPathHost,
} from './treeSitter/runtime/pathHost';
export type { TreeSitterPathHost } from './treeSitter/runtime/pathHost';
export {
  getCodeGraphyDirectoryPath,
  getGraphCachePath,
  getWorkspaceMetaPath,
  getWorkspaceSettingsPath,
  resolveWorkspaceRoot,
} from './workspace/paths';
export type {
  CodeGraphyWorkspacePluginSettings,
  CodeGraphyWorkspaceSettings,
} from './workspace/settings';
export {
  CODEGRAPHY_MARKDOWN_PLUGIN_ID,
  CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
  createDefaultCodeGraphyWorkspaceSettings,
  createInitialCodeGraphyWorkspaceSettings,
  ensureCodeGraphyWorkspaceSettings,
  normalizeCodeGraphyWorkspaceSettings,
  readCodeGraphyWorkspaceSettings,
  readCodeGraphyWorkspaceSettingsOrInitial,
  writeCodeGraphyWorkspaceSettings,
} from './workspace/settings';
export type { CodeGraphyWorkspaceMeta } from './workspace/meta';
export {
  createDefaultCodeGraphyWorkspaceMeta,
  persistCodeGraphyWorkspaceIndexMetadata,
  readCodeGraphyWorkspaceMeta,
  writeCodeGraphyWorkspaceMeta,
} from './workspace/meta';
export {
  createCodeGraphyWorkspacePluginSignature,
  createCodeGraphyWorkspacePackageAwarePluginSignature,
  createCodeGraphyWorkspaceSettingsSignature,
} from './workspace/signatures';
export type {
  GraphQueryReport as WorkspaceGraphQueryReport,
  IndexWorkspaceResult,
  WorkspaceGraphQueryInput,
  WorkspaceGraphQueryResult,
  WorkspacePathInput,
  WorkspaceStatusResult,
} from './workspace/requestTypes';
export { requestCodeGraphyIndexWorkspace } from './workspace/requestIndexing';
export { requestWorkspaceGraphQuery } from './workspace/requestQuery';
export { readCodeGraphyWorkspaceStatusForCli } from './workspace/requestStatus';
export type {
  CodeGraphyWorkspaceStaleReason,
  CodeGraphyWorkspaceStatus,
  CodeGraphyWorkspaceStatusState,
  ReadCodeGraphyWorkspaceStatusOptions,
} from './workspace/status';
export { readCodeGraphyWorkspaceStatus } from './workspace/status';
export { filterWorkspaceStatusPendingChangedFiles } from './workspace/statusPendingFiles';
export type {
  GraphQueryConfig,
  GraphQueryConnectionConfig,
  GraphQueryData,
  GraphQueryEdgeReport,
  GraphQueryEdgeReportItem,
  GraphQueryFilter,
  GraphQueryFilterOperator,
  GraphQueryNodeReport,
  GraphQueryNodeReportItem,
  GraphQueryPage,
  GraphQueryPathConfig,
  GraphQueryPathReport,
  GraphQueryReport,
  GraphQueryRequest,
  GraphQueryRelationshipKindGroup,
  GraphQueryRelationshipProvenance,
  GraphQueryRelationshipReport,
  GraphQueryRelationshipReportItem,
  GraphQueryRelationshipSymbol,
  GraphQueryResult,
  GraphQueryScope,
  GraphQuerySort,
  GraphQuerySymbolReport,
  GraphQuerySymbolReportItem,
  GraphQuerySymbolsConfig,
} from './graphQuery';
export {
  executeGraphQuery,
  findGraphPaths,
  listGraphEdges,
  listGraphNodes,
  listGraphRelationships,
  listGraphSymbols,
} from './graphQuery';
