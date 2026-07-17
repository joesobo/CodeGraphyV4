import type { IWorkspaceAnalysisCache } from '../../../analysis/cache';
import type { IGraphData, IGraphEdge, IGraphNode } from '../../../graph/contracts';
import {
  executeStatementAsync,
  executeStatementSync,
  prepareStatementAsync,
  prepareStatementSync,
} from '../io/connection';
import type {
  SQLiteConnection,
  SQLiteStatement,
  SQLiteValue,
} from '../io/connection';

const CREATE_INDEXED_FILE_STATEMENT = 'INSERT INTO IndexedFile(path, mtime, size, contentHash, analyzerStateJson) VALUES (@path, @mtime, @size, @contentHash, @analyzerStateJson)';
const CREATE_NODE_STATEMENT = 'INSERT INTO Node(id, type, label, filePath, parentId, propertiesJson) VALUES (@id, @type, @label, @filePath, @parentId, @propertiesJson)';
const CREATE_EDGE_STATEMENT = 'INSERT INTO Edge(id, sourceId, targetId, type, propertiesJson, provenanceJson) VALUES (@id, @sourceId, @targetId, @type, @propertiesJson, @provenanceJson)';
const DELETE_INDEXED_FILE_STATEMENT = 'DELETE FROM IndexedFile WHERE path = @path';

export interface WorkspaceAnalysisCacheWriter {
  connection: SQLiteConnection;
  indexedFileStatement: SQLiteStatement;
  nodeStatement: SQLiteStatement;
  edgeStatement: SQLiteStatement;
}

export interface WorkspaceAnalysisCachePatchWriter extends WorkspaceAnalysisCacheWriter {
  deleteIndexedFileStatement: SQLiteStatement;
}

function createIndexedFileParams(
  filePath: string,
  entry: IWorkspaceAnalysisCache['files'][string],
): Record<string, SQLiteValue> {
  return {
    path: filePath,
    mtime: entry.mtime ?? 0,
    size: entry.size ?? 0,
    contentHash: entry.contentHash ?? null,
    analyzerStateJson: JSON.stringify(entry.analysis),
  };
}

function nodeFilePath(node: IGraphNode): string | null {
  if (node.symbol?.filePath) return node.symbol.filePath;
  if ((node.nodeType ?? 'file') === 'file') return node.id;
  const metadataPath = node.metadata?.filePath;
  return typeof metadataPath === 'string' ? metadataPath : null;
}

function nodeParentId(node: IGraphNode): string | null {
  const parentId = node.metadata?.parentId;
  return typeof parentId === 'string' ? parentId : null;
}

function createNodeParams(node: IGraphNode): Record<string, SQLiteValue> {
  const { id, label, nodeType, ...properties } = node;
  return {
    id,
    type: nodeType ?? 'file',
    label,
    filePath: nodeFilePath(node),
    parentId: nodeParentId(node),
    propertiesJson: JSON.stringify(properties),
  };
}

function createEdgeParams(edge: IGraphEdge): Record<string, SQLiteValue> {
  const { id, from, to, kind, sources, ...properties } = edge;
  return {
    id,
    sourceId: from,
    targetId: to,
    type: kind,
    propertiesJson: JSON.stringify(properties),
    provenanceJson: JSON.stringify(sources),
  };
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
    indexedFileStatement: prepareStatementSync(connection, CREATE_INDEXED_FILE_STATEMENT),
    nodeStatement: prepareStatementSync(connection, CREATE_NODE_STATEMENT),
    edgeStatement: prepareStatementSync(connection, CREATE_EDGE_STATEMENT),
  };
}

export function createWorkspaceAnalysisCachePatchWriter(
  connection: SQLiteConnection,
): WorkspaceAnalysisCachePatchWriter {
  return {
    ...createWorkspaceAnalysisCacheWriter(connection),
    deleteIndexedFileStatement: prepareStatementSync(connection, DELETE_INDEXED_FILE_STATEMENT),
  };
}

export async function createWorkspaceAnalysisCacheWriterAsync(
  connection: SQLiteConnection,
): Promise<WorkspaceAnalysisCacheWriter> {
  const [indexedFileStatement, nodeStatement, edgeStatement] = await Promise.all([
    prepareStatementAsync(connection, CREATE_INDEXED_FILE_STATEMENT),
    prepareStatementAsync(connection, CREATE_NODE_STATEMENT),
    prepareStatementAsync(connection, CREATE_EDGE_STATEMENT),
  ]);
  return { connection, indexedFileStatement, nodeStatement, edgeStatement };
}

export function persistAnalysisEntry(
  writer: WorkspaceAnalysisCacheWriter,
  filePath: string,
  entry: IWorkspaceAnalysisCache['files'][string],
): void {
  executeStatementSync(
    writer.connection,
    writer.indexedFileStatement,
    createIndexedFileParams(filePath, entry),
  );
}

export function persistGraph(
  writer: WorkspaceAnalysisCacheWriter,
  graph: IGraphData,
): void {
  const nodeIds = new Set(graph.nodes.map(node => node.id));
  for (const node of [...graph.nodes].sort((left, right) => left.id.localeCompare(right.id))) {
    executeStatementSync(writer.connection, writer.nodeStatement, createNodeParams(node));
  }
  for (const edge of [...graph.edges]
    .filter(edge => nodeIds.has(edge.from) && nodeIds.has(edge.to))
    .sort((left, right) => left.id.localeCompare(right.id))) {
    executeStatementSync(writer.connection, writer.edgeStatement, createEdgeParams(edge));
  }
}

export function deleteAnalysisEntry(
  writer: WorkspaceAnalysisCachePatchWriter,
  filePath: string,
): void {
  executeStatementSync(
    writer.connection,
    writer.deleteIndexedFileStatement,
    { path: filePath },
  );
}

async function executeStatementAndYield(
  writer: WorkspaceAnalysisCacheWriter,
  preparedStatement: SQLiteStatement,
  params: Record<string, SQLiteValue>,
  afterStatement: () => Promise<void>,
): Promise<void> {
  await executeStatementAsync(writer.connection, preparedStatement, params);
  await afterStatement();
}

export async function persistAnalysisEntryAsync(
  writer: WorkspaceAnalysisCacheWriter,
  filePath: string,
  entry: IWorkspaceAnalysisCache['files'][string],
  afterStatement: () => Promise<void>,
): Promise<void> {
  await executeStatementAndYield(
    writer,
    writer.indexedFileStatement,
    createIndexedFileParams(filePath, entry),
    afterStatement,
  );
}

export async function persistGraphAsync(
  writer: WorkspaceAnalysisCacheWriter,
  graph: IGraphData,
  afterStatement: () => Promise<void>,
): Promise<void> {
  const nodeIds = new Set(graph.nodes.map(node => node.id));
  for (const node of [...graph.nodes].sort((left, right) => left.id.localeCompare(right.id))) {
    await executeStatementAndYield(writer, writer.nodeStatement, createNodeParams(node), afterStatement);
  }
  for (const edge of [...graph.edges]
    .filter(edge => nodeIds.has(edge.from) && nodeIds.has(edge.to))
    .sort((left, right) => left.id.localeCompare(right.id))) {
    await executeStatementAndYield(writer, writer.edgeStatement, createEdgeParams(edge), afterStatement);
  }
}
