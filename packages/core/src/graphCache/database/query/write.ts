import type { IWorkspaceAnalysisCache } from '../../../analysis/cache';
import type { IGraphData } from '../../../graph/contracts';
import {
  executeStatementAsync,
  executeStatementSync,
  prepareStatementAsync,
  prepareStatementSync,
  readRowsSync,
} from '../io/connection';
import type {
  SQLiteConnection,
  SQLiteStatement,
  SQLiteValue,
} from '../io/connection';
import {
  serializeDatabaseRecords,
  type DatabaseRecord,
  type NormalizedDatabaseRecords,
} from '../records/serializer';
import {
  EDGE_COLUMNS,
  FILE_COLUMNS,
  NODE_COLUMNS,
  SYMBOL_COLUMNS,
  type EdgeRecord,
  type NodeRecord,
  type SymbolRecord,
} from '../records/types';

function createInsertStatement(table: string, columns: readonly string[]): string {
  return `INSERT INTO ${table}(${columns.join(', ')}) VALUES (${columns.map(column => `@${column}`).join(', ')})`;
}

const CREATE_FILE_STATEMENT = createInsertStatement('File', FILE_COLUMNS);
const CREATE_NODE_STATEMENT = createInsertStatement('Node', NODE_COLUMNS);
const CREATE_SYMBOL_STATEMENT = createInsertStatement('Symbol', SYMBOL_COLUMNS);
const CREATE_EDGE_STATEMENT = createInsertStatement('Edge', EDGE_COLUMNS);
const UPDATE_NODE_PARENT_STATEMENT = 'UPDATE Node SET parentId = @parentId WHERE id = @id';
const DELETE_FILE_STATEMENT = 'DELETE FROM File WHERE path = @path';

export interface WorkspaceAnalysisCacheWriter {
  connection: SQLiteConnection;
  fileStatement: SQLiteStatement;
  nodeStatement: SQLiteStatement;
  symbolStatement: SQLiteStatement;
  edgeStatement: SQLiteStatement;
  nodeParentStatement: SQLiteStatement;
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
    symbolStatement: prepareStatementSync(connection, CREATE_SYMBOL_STATEMENT),
    edgeStatement: prepareStatementSync(connection, CREATE_EDGE_STATEMENT),
    nodeParentStatement: prepareStatementSync(connection, UPDATE_NODE_PARENT_STATEMENT),
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
  const [fileStatement, nodeStatement, symbolStatement, edgeStatement, nodeParentStatement] = await Promise.all([
    prepareStatementAsync(connection, CREATE_FILE_STATEMENT),
    prepareStatementAsync(connection, CREATE_NODE_STATEMENT),
    prepareStatementAsync(connection, CREATE_SYMBOL_STATEMENT),
    prepareStatementAsync(connection, CREATE_EDGE_STATEMENT),
    prepareStatementAsync(connection, UPDATE_NODE_PARENT_STATEMENT),
  ]);
  return { connection, fileStatement, nodeStatement, symbolStatement, edgeStatement, nodeParentStatement };
}

function readIdMap(
  connection: SQLiteConnection,
  table: 'File' | 'Node',
  keyColumn: 'path' | 'key',
): Map<string, number> {
  return new Map(readRowsSync(connection, `SELECT id, ${keyColumn} AS key FROM ${table}`).flatMap(row => (
    typeof row.key === 'string' && (typeof row.id === 'number' || typeof row.id === 'bigint')
      ? [[row.key, Number(row.id)] as const]
      : []
  )));
}

function optionalReferenceId(value: SQLiteValue, ids: ReadonlyMap<string, number>): number | null {
  return value === null ? null : ids.get(String(value)) ?? null;
}

function requiredReferenceId(
  value: SQLiteValue,
  ids: ReadonlyMap<string, number>,
  relationship: string,
): number {
  const id = value === null ? undefined : ids.get(String(value));
  if (id === undefined) {
    throw new Error(`Cannot persist ${relationship}: referenced key ${String(value)} does not exist.`);
  }
  return id;
}

function storedNodeRecord(record: NodeRecord, fileIds: ReadonlyMap<string, number>): NodeRecord {
  return {
    ...record,
    fileId: optionalReferenceId(record.fileId, fileIds),
    parentId: null,
  };
}

function storedSymbolRecord(record: SymbolRecord, nodeIds: ReadonlyMap<string, number>): SymbolRecord {
  return {
    ...record,
    nodeId: requiredReferenceId(record.nodeId, nodeIds, 'symbol node'),
  };
}

function storedEdgeRecord(
  record: EdgeRecord,
  fileIds: ReadonlyMap<string, number>,
  nodeIds: ReadonlyMap<string, number>,
): EdgeRecord {
  return {
    ...record,
    sourceNodeId: requiredReferenceId(record.sourceNodeId, nodeIds, 'edge source'),
    targetNodeId: requiredReferenceId(record.targetNodeId, nodeIds, 'edge target'),
    ownerFileId: optionalReferenceId(record.ownerFileId, fileIds),
  };
}

function parentUpdate(
  record: NodeRecord,
  nodeIds: ReadonlyMap<string, number>,
): DatabaseRecord | undefined {
  if (record.parentId === null) return undefined;
  const id = requiredReferenceId(record.key, nodeIds, 'node parent owner');
  const parentId = optionalReferenceId(record.parentId, nodeIds);
  return parentId === null ? undefined : { id, parentId };
}

function persistRecords(
  writer: WorkspaceAnalysisCacheWriter,
  records: NormalizedDatabaseRecords,
): void {
  for (const record of records.files) {
    executeStatementSync(writer.connection, writer.fileStatement, record);
  }
  const fileIds = readIdMap(writer.connection, 'File', 'path');
  for (const record of records.nodes) {
    executeStatementSync(writer.connection, writer.nodeStatement, storedNodeRecord(record, fileIds));
  }
  const nodeIds = readIdMap(writer.connection, 'Node', 'key');
  for (const record of records.nodes) {
    const update = parentUpdate(record, nodeIds);
    if (update) executeStatementSync(writer.connection, writer.nodeParentStatement, update);
  }
  for (const record of records.symbols) {
    executeStatementSync(writer.connection, writer.symbolStatement, storedSymbolRecord(record, nodeIds));
  }
  for (const record of records.edges) {
    executeStatementSync(writer.connection, writer.edgeStatement, storedEdgeRecord(record, fileIds, nodeIds));
  }
}

export function persistWorkspaceCache(
  writer: WorkspaceAnalysisCacheWriter,
  cache: IWorkspaceAnalysisCache,
  graph?: IGraphData,
): void {
  persistRecords(writer, serializeDatabaseRecords(cache, graph));
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
  persistRecords(writer, serializeDatabaseRecords({ version: '', files: {} }, graph));
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
  const fileIds = readIdMap(writer.connection, 'File', 'path');
  for (const record of records.nodes) {
    await executeStatementAndYield(writer, writer.nodeStatement, storedNodeRecord(record, fileIds), afterStatement);
  }
  const nodeIds = readIdMap(writer.connection, 'Node', 'key');
  for (const record of records.nodes) {
    const update = parentUpdate(record, nodeIds);
    if (update) await executeStatementAndYield(writer, writer.nodeParentStatement, update, afterStatement);
  }
  for (const record of records.symbols) {
    await executeStatementAndYield(
      writer,
      writer.symbolStatement,
      storedSymbolRecord(record, nodeIds),
      afterStatement,
    );
  }
  for (const record of records.edges) {
    await executeStatementAndYield(
      writer,
      writer.edgeStatement,
      storedEdgeRecord(record, fileIds, nodeIds),
      afterStatement,
    );
  }
}

export async function persistWorkspaceCacheAsync(
  writer: WorkspaceAnalysisCacheWriter,
  cache: IWorkspaceAnalysisCache,
  graph: IGraphData | undefined,
  afterStatement: () => Promise<void>,
): Promise<void> {
  await persistRecordsAsync(writer, serializeDatabaseRecords(cache, graph), afterStatement);
}

export async function persistAnalysisEntryAsync(
  writer: WorkspaceAnalysisCacheWriter,
  filePath: string,
  entry: IWorkspaceAnalysisCache['files'][string],
  afterStatement: () => Promise<void>,
): Promise<void> {
  await persistRecordsAsync(
    writer,
    serializeDatabaseRecords({ version: '', files: { [filePath]: entry } }),
    afterStatement,
  );
}

export async function persistGraphAsync(
  writer: WorkspaceAnalysisCacheWriter,
  graph: IGraphData,
  afterStatement: () => Promise<void>,
): Promise<void> {
  await persistRecordsAsync(
    writer,
    serializeDatabaseRecords({ version: '', files: {} }, graph),
    afterStatement,
  );
}
