import type { IWorkspaceAnalysisCache } from '../../../analysis/cache';
import type { IAnalysisNode, IAnalysisRelation, IAnalysisSymbol, IPluginEdgeType, IPluginNodeType } from '@codegraphy-dev/plugin-api';
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

const CREATE_FILE_STATEMENT = 'INSERT INTO File(filePath, mtime, size, contentHash, factsJson) VALUES (@filePath, @mtime, @size, @contentHash, @factsJson)';
const CREATE_SYMBOL_STATEMENT = 'INSERT INTO Symbol(symbolId, filePath, name, kind, signature, rangeJson, metadataJson) VALUES (@symbolId, @filePath, @name, @kind, @signature, @rangeJson, @metadataJson)';
const CREATE_NODE_STATEMENT = 'INSERT INTO Node(nodeId, filePath, nodeType, label, sourceFilePath, parentId, metadataJson) VALUES (@nodeId, @filePath, @nodeType, @label, @sourceFilePath, @parentId, @metadataJson)';
const CREATE_NODE_TYPE_STATEMENT = 'INSERT INTO NodeType(recordId, filePath, typeId, label, defaultColor, defaultVisible, parentId, descriptionJson) VALUES (@recordId, @filePath, @typeId, @label, @defaultColor, @defaultVisible, @parentId, @descriptionJson)';
const CREATE_EDGE_TYPE_STATEMENT = 'INSERT INTO EdgeType(recordId, filePath, typeId, label, defaultColor, defaultVisible, descriptionJson) VALUES (@recordId, @filePath, @typeId, @label, @defaultColor, @defaultVisible, @descriptionJson)';
const CREATE_RELATION_STATEMENT = 'INSERT INTO Relation(relationId, filePath, kind, pluginId, sourceId, fromFilePath, toFilePath, fromNodeId, toNodeId, fromSymbolId, toSymbolId, specifier, relationType, variant, resolvedPath, metadataJson) VALUES (@relationId, @filePath, @kind, @pluginId, @sourceId, @fromFilePath, @toFilePath, @fromNodeId, @toNodeId, @fromSymbolId, @toSymbolId, @specifier, @relationType, @variant, @resolvedPath, @metadataJson)';
const DELETE_FILE_STATEMENT = 'DELETE FROM File WHERE filePath = @filePath';
const DELETE_SYMBOL_STATEMENT = 'DELETE FROM Symbol WHERE filePath = @filePath';
const DELETE_NODE_STATEMENT = 'DELETE FROM Node WHERE filePath = @filePath';
const DELETE_NODE_TYPE_STATEMENT = 'DELETE FROM NodeType WHERE filePath = @filePath';
const DELETE_EDGE_TYPE_STATEMENT = 'DELETE FROM EdgeType WHERE filePath = @filePath';
const DELETE_RELATION_STATEMENT = 'DELETE FROM Relation WHERE filePath = @filePath';

export interface WorkspaceAnalysisCacheWriter {
  connection: SQLiteConnection;
  fileAnalysisStatement: SQLiteStatement;
  symbolStatement: SQLiteStatement;
  nodeStatement: SQLiteStatement;
  nodeTypeStatement: SQLiteStatement;
  edgeTypeStatement: SQLiteStatement;
  relationStatement: SQLiteStatement;
}

export interface WorkspaceAnalysisCachePatchWriter extends WorkspaceAnalysisCacheWriter {
  deleteFileAnalysisStatement: SQLiteStatement;
  deleteSymbolStatement: SQLiteStatement;
  deleteNodeStatement: SQLiteStatement;
  deleteNodeTypeStatement: SQLiteStatement;
  deleteEdgeTypeStatement: SQLiteStatement;
  deleteRelationStatement: SQLiteStatement;
}

function createFileAnalysisParams(
  filePath: string,
  entry: IWorkspaceAnalysisCache['files'][string],
): Record<string, SQLiteValue> {
  const analysis = { ...entry.analysis };
  delete analysis.symbols;
  delete analysis.relations;
  delete analysis.nodes;
  delete analysis.nodeTypes;
  delete analysis.edgeTypes;
  return {
    filePath,
    mtime: entry.mtime ?? 0,
    size: entry.size ?? 0,
    contentHash: entry.contentHash ?? null,
    factsJson: JSON.stringify(analysis),
  };
}

function createNodeParams(filePath: string, node: IAnalysisNode): Record<string, SQLiteValue> {
  return { nodeId: node.id, filePath, nodeType: node.nodeType, label: node.label, sourceFilePath: node.filePath ?? null, parentId: node.parentId ?? null, metadataJson: optionalJson(node.metadata) };
}

function createNodeTypeParams(filePath: string, type: IPluginNodeType): Record<string, SQLiteValue> {
  return { recordId: `${filePath}:${type.id}`, filePath, typeId: type.id, label: type.label, defaultColor: type.defaultColor, defaultVisible: type.defaultVisible ? 1 : 0, parentId: type.parentId ?? null, descriptionJson: optionalJson(type.description) };
}

function createEdgeTypeParams(filePath: string, type: IPluginEdgeType): Record<string, SQLiteValue> {
  return { recordId: `${filePath}:${type.id}`, filePath, typeId: type.id, label: type.label, defaultColor: type.defaultColor, defaultVisible: type.defaultVisible ? 1 : 0, descriptionJson: optionalJson(type.description) };
}

function optionalJson(value: unknown): string | null {
  return value === undefined ? null : JSON.stringify(value);
}

function createSymbolParams(filePath: string, symbol: IAnalysisSymbol): Record<string, SQLiteValue> {
  return {
    symbolId: symbol.id,
    filePath,
    name: symbol.name,
    kind: symbol.kind,
    signature: symbol.signature ?? null,
    rangeJson: optionalJson(symbol.range),
    metadataJson: optionalJson(symbol.metadata),
  };
}

function createRelationParams(
  filePath: string,
  relation: IAnalysisRelation,
  index: number,
): Record<string, SQLiteValue> {
  return {
    relationId: `${filePath}:${index}`,
    filePath,
    kind: relation.kind,
    pluginId: relation.pluginId ?? null,
    sourceId: relation.sourceId,
    fromFilePath: relation.fromFilePath ?? null,
    toFilePath: relation.toFilePath ?? null,
    fromNodeId: relation.fromNodeId ?? null,
    toNodeId: relation.toNodeId ?? null,
    fromSymbolId: relation.fromSymbolId ?? null,
    toSymbolId: relation.toSymbolId ?? null,
    specifier: relation.specifier ?? null,
    relationType: relation.type ?? null,
    variant: relation.variant ?? null,
    resolvedPath: relation.resolvedPath ?? null,
    metadataJson: optionalJson(relation.metadata),
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
    fileAnalysisStatement: prepareStatementSync(connection, CREATE_FILE_STATEMENT),
    symbolStatement: prepareStatementSync(connection, CREATE_SYMBOL_STATEMENT),
    nodeStatement: prepareStatementSync(connection, CREATE_NODE_STATEMENT),
    nodeTypeStatement: prepareStatementSync(connection, CREATE_NODE_TYPE_STATEMENT),
    edgeTypeStatement: prepareStatementSync(connection, CREATE_EDGE_TYPE_STATEMENT),
    relationStatement: prepareStatementSync(connection, CREATE_RELATION_STATEMENT),
  };
}

export function createWorkspaceAnalysisCachePatchWriter(
  connection: SQLiteConnection,
): WorkspaceAnalysisCachePatchWriter {
  return {
    ...createWorkspaceAnalysisCacheWriter(connection),
    deleteFileAnalysisStatement: prepareStatementSync(connection, DELETE_FILE_STATEMENT),
    deleteSymbolStatement: prepareStatementSync(connection, DELETE_SYMBOL_STATEMENT),
    deleteNodeStatement: prepareStatementSync(connection, DELETE_NODE_STATEMENT),
    deleteNodeTypeStatement: prepareStatementSync(connection, DELETE_NODE_TYPE_STATEMENT),
    deleteEdgeTypeStatement: prepareStatementSync(connection, DELETE_EDGE_TYPE_STATEMENT),
    deleteRelationStatement: prepareStatementSync(connection, DELETE_RELATION_STATEMENT),
  };
}

export async function createWorkspaceAnalysisCacheWriterAsync(
  connection: SQLiteConnection,
): Promise<WorkspaceAnalysisCacheWriter> {
  const [fileAnalysisStatement, symbolStatement, nodeStatement, nodeTypeStatement, edgeTypeStatement, relationStatement] = await Promise.all([
    prepareStatementAsync(connection, CREATE_FILE_STATEMENT),
    prepareStatementAsync(connection, CREATE_SYMBOL_STATEMENT),
    prepareStatementAsync(connection, CREATE_NODE_STATEMENT),
    prepareStatementAsync(connection, CREATE_NODE_TYPE_STATEMENT),
    prepareStatementAsync(connection, CREATE_EDGE_TYPE_STATEMENT),
    prepareStatementAsync(connection, CREATE_RELATION_STATEMENT),
  ]);
  return {
    connection,
    fileAnalysisStatement,
    symbolStatement, nodeStatement, nodeTypeStatement, edgeTypeStatement,
    relationStatement,
  };
}

export function persistAnalysisEntry(
  writer: WorkspaceAnalysisCacheWriter,
  filePath: string,
  entry: IWorkspaceAnalysisCache['files'][string],
): void {
  executeStatementSync(writer.connection, writer.fileAnalysisStatement, createFileAnalysisParams(filePath, entry));
  for (const symbol of entry.analysis.symbols ?? []) {
    executeStatementSync(writer.connection, writer.symbolStatement, createSymbolParams(filePath, symbol));
  }
  for (const node of entry.analysis.nodes ?? []) executeStatementSync(writer.connection, writer.nodeStatement, createNodeParams(filePath, node));
  for (const type of entry.analysis.nodeTypes ?? []) executeStatementSync(writer.connection, writer.nodeTypeStatement, createNodeTypeParams(filePath, type));
  for (const type of entry.analysis.edgeTypes ?? []) executeStatementSync(writer.connection, writer.edgeTypeStatement, createEdgeTypeParams(filePath, type));
  for (const [index, relation] of (entry.analysis.relations ?? []).entries()) {
    executeStatementSync(writer.connection, writer.relationStatement, createRelationParams(filePath, relation, index));
  }
}

export function deleteAnalysisEntry(
  writer: WorkspaceAnalysisCachePatchWriter,
  filePath: string,
): void {
  const params = { filePath };
  executeStatementSync(writer.connection, writer.deleteFileAnalysisStatement, params);
  executeStatementSync(writer.connection, writer.deleteSymbolStatement, params);
  executeStatementSync(writer.connection, writer.deleteNodeStatement, params);
  executeStatementSync(writer.connection, writer.deleteNodeTypeStatement, params);
  executeStatementSync(writer.connection, writer.deleteEdgeTypeStatement, params);
  executeStatementSync(writer.connection, writer.deleteRelationStatement, params);
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
    writer.fileAnalysisStatement,
    createFileAnalysisParams(filePath, entry),
    afterStatement,
  );
  for (const symbol of entry.analysis.symbols ?? []) {
    await executeStatementAndYield(
      writer,
      writer.symbolStatement,
      createSymbolParams(filePath, symbol),
      afterStatement,
    );
  }
  for (const node of entry.analysis.nodes ?? []) await executeStatementAndYield(writer, writer.nodeStatement, createNodeParams(filePath, node), afterStatement);
  for (const type of entry.analysis.nodeTypes ?? []) await executeStatementAndYield(writer, writer.nodeTypeStatement, createNodeTypeParams(filePath, type), afterStatement);
  for (const type of entry.analysis.edgeTypes ?? []) await executeStatementAndYield(writer, writer.edgeTypeStatement, createEdgeTypeParams(filePath, type), afterStatement);
  for (const [index, relation] of (entry.analysis.relations ?? []).entries()) {
    await executeStatementAndYield(
      writer,
      writer.relationStatement,
      createRelationParams(filePath, relation, index),
      afterStatement,
    );
  }
}
