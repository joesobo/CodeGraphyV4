import type { IWorkspaceAnalysisCache } from '../../../analysis/cache';
import type { IGraphData } from '../../../graph/contracts';
import {
  executeStatementAsync,
  executeStatementSync,
  prepareStatementAsync,
  prepareStatementSync,
} from '../io/connection';
import type {
  SQLiteConnection,
  SQLiteStatement,
} from '../io/connection';
import {
  normalizeDatabaseRecords,
  type DatabaseRecord,
  type NormalizedDatabaseRecords,
} from '../records/normalize';

const CREATE_FILE_STATEMENT = `INSERT INTO File(
  path, analysisPath, mtime, size, contentHash, nodesIndexed, symbolsIndexed, relationsIndexed,
  cacheTiersIndexed
) VALUES (
  @path, @analysisPath, @mtime, @size, @contentHash, @nodesIndexed, @symbolsIndexed,
  @relationsIndexed, @cacheTiersIndexed
)`;

const CREATE_NODE_STATEMENT = `INSERT INTO Node(
  id, type, label, filePath, parentId, color, x, y, favorite, fileSize, depthLevel,
  shape, shapeWidth, shapeHeight, cornerRadius, collisionRadius, chargeStrengthMultiplier,
  fillOpacity, pointerWidth, pointerHeight, imageUrl, isCollapsible, isCollapsed,
  collapsedDescendantCount, analysisNodeId, analysisNodeFilePath, analysisParentId,
  analysisNodeOrder, analysisSymbolId, analysisSymbolFilePath, analysisSymbolOrder,
  pluginId, language, analysisSource, pluginKind,
  symbolName, symbolKind, symbolSignature, startLine, startColumn, endLine, endColumn,
  gitIgnored, gitIgnoredReason, unityClass, unityFileId, unityGameObjectFileId,
  unityScriptGuid, unityScriptPath
) VALUES (
  @id, @type, @label, @filePath, @parentId, @color, @x, @y, @favorite, @fileSize, @depthLevel,
  @shape, @shapeWidth, @shapeHeight, @cornerRadius, @collisionRadius, @chargeStrengthMultiplier,
  @fillOpacity, @pointerWidth, @pointerHeight, @imageUrl, @isCollapsible, @isCollapsed,
  @collapsedDescendantCount, @analysisNodeId, @analysisNodeFilePath, @analysisParentId,
  @analysisNodeOrder, @analysisSymbolId, @analysisSymbolFilePath, @analysisSymbolOrder,
  @pluginId, @language, @analysisSource, @pluginKind,
  @symbolName, @symbolKind, @symbolSignature, @startLine, @startColumn, @endLine, @endColumn,
  @gitIgnored, @gitIgnoredReason, @unityClass, @unityFileId, @unityGameObjectFileId,
  @unityScriptGuid, @unityScriptPath
)`;

const CREATE_EDGE_STATEMENT = `INSERT INTO Edge(
  id, graphId, sourceNodeId, targetNodeId, type, ownerFilePath, color, sourcePluginId,
  relationPluginId, sourceKey, pluginSourceId, analysisSourceId, sourceLabel, variant,
  specifier, resolvedPath, relationType, fromFilePath,
  toFilePath, fromAnalysisNodeId, toAnalysisNodeId, fromSymbolId, toSymbolId, language,
  analysisSource, bindingKind, importedName, localName, memberName, signalName, eventMethodName,
  targetFileId, targetScriptPath, targetScriptGuid, scriptGuid, prefabGuid, fieldName,
  guid, analysisRelation, analysisOrder, canonicalGraphEdge
) VALUES (
  @id, @graphId, @sourceNodeId, @targetNodeId, @type, @ownerFilePath, @color, @sourcePluginId,
  @relationPluginId, @sourceKey, @pluginSourceId, @analysisSourceId, @sourceLabel, @variant,
  @specifier, @resolvedPath, @relationType, @fromFilePath,
  @toFilePath, @fromAnalysisNodeId, @toAnalysisNodeId, @fromSymbolId, @toSymbolId, @language,
  @analysisSource, @bindingKind, @importedName, @localName, @memberName, @signalName, @eventMethodName,
  @targetFileId, @targetScriptPath, @targetScriptGuid, @scriptGuid, @prefabGuid, @fieldName,
  @guid, @analysisRelation, @analysisOrder, @canonicalGraphEdge
)`;

const DELETE_FILE_STATEMENT = 'DELETE FROM File WHERE path = @path';

export interface WorkspaceAnalysisCacheWriter {
  connection: SQLiteConnection;
  fileStatement: SQLiteStatement;
  nodeStatement: SQLiteStatement;
  edgeStatement: SQLiteStatement;
}

export interface WorkspaceAnalysisCachePatchWriter extends WorkspaceAnalysisCacheWriter {
  deleteFileStatement: SQLiteStatement;
}

export function sortedCacheEntries(
  cache: IWorkspaceAnalysisCache,
): Array<[string, IWorkspaceAnalysisCache['files'][string]]> {
  return Object.entries(cache.files).sort(([left], [right]) => left.localeCompare(right));
}

export function createWorkspaceAnalysisCacheWriter(
  connection: SQLiteConnection,
): WorkspaceAnalysisCacheWriter {
  return {
    connection,
    fileStatement: prepareStatementSync(connection, CREATE_FILE_STATEMENT),
    nodeStatement: prepareStatementSync(connection, CREATE_NODE_STATEMENT),
    edgeStatement: prepareStatementSync(connection, CREATE_EDGE_STATEMENT),
  };
}

export function createWorkspaceAnalysisCachePatchWriter(
  connection: SQLiteConnection,
): WorkspaceAnalysisCachePatchWriter {
  return {
    ...createWorkspaceAnalysisCacheWriter(connection),
    deleteFileStatement: prepareStatementSync(connection, DELETE_FILE_STATEMENT),
  };
}

export async function createWorkspaceAnalysisCacheWriterAsync(
  connection: SQLiteConnection,
): Promise<WorkspaceAnalysisCacheWriter> {
  const [fileStatement, nodeStatement, edgeStatement] = await Promise.all([
    prepareStatementAsync(connection, CREATE_FILE_STATEMENT),
    prepareStatementAsync(connection, CREATE_NODE_STATEMENT),
    prepareStatementAsync(connection, CREATE_EDGE_STATEMENT),
  ]);
  return { connection, fileStatement, nodeStatement, edgeStatement };
}

function persistRecords(
  writer: WorkspaceAnalysisCacheWriter,
  records: NormalizedDatabaseRecords,
): void {
  for (const record of records.files) {
    executeStatementSync(writer.connection, writer.fileStatement, record);
  }
  for (const record of records.nodes) {
    executeStatementSync(writer.connection, writer.nodeStatement, record);
  }
  for (const record of records.edges) {
    executeStatementSync(writer.connection, writer.edgeStatement, record);
  }
}

export function persistWorkspaceCache(
  writer: WorkspaceAnalysisCacheWriter,
  cache: IWorkspaceAnalysisCache,
  graph?: IGraphData,
): void {
  persistRecords(writer, normalizeDatabaseRecords(cache, graph));
}

export function persistAnalysisEntry(
  writer: WorkspaceAnalysisCacheWriter,
  filePath: string,
  entry: IWorkspaceAnalysisCache['files'][string],
): void {
  persistWorkspaceCache(writer, { version: '', files: { [filePath]: entry } });
}

export function persistGraph(
  writer: WorkspaceAnalysisCacheWriter,
  graph: IGraphData,
): void {
  const records = normalizeDatabaseRecords({ version: '', files: {} }, graph);
  for (const record of records.nodes) {
    executeStatementSync(writer.connection, writer.nodeStatement, record);
  }
  for (const record of records.edges) {
    executeStatementSync(writer.connection, writer.edgeStatement, record);
  }
}

export function deleteAnalysisEntry(
  writer: WorkspaceAnalysisCachePatchWriter,
  filePath: string,
): void {
  executeStatementSync(writer.connection, writer.deleteFileStatement, { path: filePath });
}

async function executeStatementAndYield(
  writer: WorkspaceAnalysisCacheWriter,
  preparedStatement: SQLiteStatement,
  params: DatabaseRecord,
  afterStatement: () => Promise<void>,
): Promise<void> {
  await executeStatementAsync(writer.connection, preparedStatement, params);
  await afterStatement();
}

async function persistRecordsAsync(
  writer: WorkspaceAnalysisCacheWriter,
  records: NormalizedDatabaseRecords,
  afterStatement: () => Promise<void>,
): Promise<void> {
  for (const record of records.files) {
    await executeStatementAndYield(writer, writer.fileStatement, record, afterStatement);
  }
  for (const record of records.nodes) {
    await executeStatementAndYield(writer, writer.nodeStatement, record, afterStatement);
  }
  for (const record of records.edges) {
    await executeStatementAndYield(writer, writer.edgeStatement, record, afterStatement);
  }
}

export async function persistWorkspaceCacheAsync(
  writer: WorkspaceAnalysisCacheWriter,
  cache: IWorkspaceAnalysisCache,
  graph: IGraphData | undefined,
  afterStatement: () => Promise<void>,
): Promise<void> {
  await persistRecordsAsync(writer, normalizeDatabaseRecords(cache, graph), afterStatement);
}

export async function persistAnalysisEntryAsync(
  writer: WorkspaceAnalysisCacheWriter,
  filePath: string,
  entry: IWorkspaceAnalysisCache['files'][string],
  afterStatement: () => Promise<void>,
): Promise<void> {
  await persistRecordsAsync(
    writer,
    normalizeDatabaseRecords({ version: '', files: { [filePath]: entry } }),
    afterStatement,
  );
}

export async function persistGraphAsync(
  writer: WorkspaceAnalysisCacheWriter,
  graph: IGraphData,
  afterStatement: () => Promise<void>,
): Promise<void> {
  const records = normalizeDatabaseRecords({ version: '', files: {} }, graph);
  await persistRecordsAsync(writer, { files: [], nodes: records.nodes, edges: records.edges }, afterStatement);
}
