export { CODEGRAPHY_CORE_PACKAGE_NAME } from './packageIdentity';
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
} from './analysis/fileAnalysis';
export { analyzeWorkspaceFiles } from './analysis/fileAnalysis';
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
  readWorkspaceAnalysisDatabaseSnapshot,
  saveWorkspaceAnalysisDatabaseCache,
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
  getCodeGraphyDirectoryPath,
  getGraphCachePath,
  getWorkspaceSettingsPath,
  resolveWorkspaceRoot,
} from './workspace/paths';
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
