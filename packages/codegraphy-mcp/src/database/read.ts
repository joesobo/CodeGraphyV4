import * as fs from 'node:fs';
import { Connection, Database } from '@ladybugdb/core';
import type * as lb from '@ladybugdb/core';
import type { IAnalysisRelation, IAnalysisSymbol } from '@codegraphy-vscode/plugin-api';
import type { DatabaseFileRecord, DatabaseSnapshot } from './model';

interface LadybugQueryResultLike {
  getAllSync?(): Record<string, unknown>[];
  close?(): void;
}

interface FileRow {
  filePath?: unknown;
  mtime?: unknown;
  size?: unknown;
}

interface SymbolRow {
  symbolId?: unknown;
  filePath?: unknown;
  name?: unknown;
  kind?: unknown;
  signature?: unknown;
  rangeJson?: unknown;
  metadataJson?: unknown;
}

interface RelationRow {
  relationId?: unknown;
  filePath?: unknown;
  kind?: unknown;
  pluginId?: unknown;
  sourceId?: unknown;
  fromFilePath?: unknown;
  toFilePath?: unknown;
  fromNodeId?: unknown;
  toNodeId?: unknown;
  fromSymbolId?: unknown;
  toSymbolId?: unknown;
  specifier?: unknown;
  relationType?: unknown;
  variant?: unknown;
  resolvedPath?: unknown;
  metadataJson?: unknown;
}

const FILE_ROWS_QUERY =
  'MATCH (entry:FileAnalysis) RETURN entry.filePath AS filePath, entry.mtime AS mtime, entry.size AS size ORDER BY entry.filePath';
const SYMBOL_ROWS_QUERY =
  'MATCH (entry:Symbol) RETURN entry.symbolId AS symbolId, entry.filePath AS filePath, entry.name AS name, entry.kind AS kind, entry.signature AS signature, entry.rangeJson AS rangeJson, entry.metadataJson AS metadataJson ORDER BY entry.filePath, entry.symbolId';
const RELATION_ROWS_QUERY =
  'MATCH (entry:Relation) RETURN entry.relationId AS relationId, entry.filePath AS filePath, entry.kind AS kind, entry.pluginId AS pluginId, entry.sourceId AS sourceId, entry.fromFilePath AS fromFilePath, entry.toFilePath AS toFilePath, entry.fromNodeId AS fromNodeId, entry.toNodeId AS toNodeId, entry.fromSymbolId AS fromSymbolId, entry.toSymbolId AS toSymbolId, entry.specifier AS specifier, entry.relationType AS relationType, entry.variant AS variant, entry.resolvedPath AS resolvedPath, entry.metadataJson AS metadataJson ORDER BY entry.filePath, entry.relationId';

function closeQueryResults(result: unknown): void {
  const queryResults = Array.isArray(result) ? result : [result];
  for (const queryResult of queryResults) {
    try {
      (queryResult as LadybugQueryResultLike | undefined)?.close?.();
    } catch {
      // Best effort only.
    }
  }
}

function readRowsSync(connection: lb.Connection, statement: string): Record<string, unknown>[] {
  const result = connection.querySync(statement);

  try {
    const queryResult = Array.isArray(result) ? result[0] : result;
    return (queryResult as LadybugQueryResultLike | undefined)?.getAllSync?.() ?? [];
  } finally {
    closeQueryResults(result);
  }
}

function withReadOnlyConnection<T>(databasePath: string, callback: (connection: lb.Connection) => T): T {
  const database = new Database(databasePath);
  const connection = new Connection(database);

  try {
    connection.initSync();
    return callback(connection);
  } finally {
    connection.closeSync();
    database.closeSync();
  }
}

function readRequiredString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function readOptionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function parseOptionalJson<T>(value: unknown): T | undefined {
  if (typeof value !== 'string' || value.length === 0) {
    return undefined;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

function createFileRecord(row: FileRow): DatabaseFileRecord | undefined {
  const filePath = readRequiredString(row.filePath);
  const mtime = readOptionalNumber(row.mtime);
  if (!filePath || mtime === undefined) {
    return undefined;
  }

  return {
    filePath,
    mtime,
    size: readOptionalNumber(row.size),
  };
}

function createSymbolRecord(row: SymbolRow): IAnalysisSymbol | undefined {
  const id = readRequiredString(row.symbolId);
  const filePath = readRequiredString(row.filePath);
  const name = readRequiredString(row.name);
  const kind = readRequiredString(row.kind);
  if (!id || !filePath || !name || !kind) {
    return undefined;
  }

  return {
    id,
    filePath,
    name,
    kind,
    signature: readOptionalString(row.signature),
    range: parseOptionalJson(row.rangeJson),
    metadata: parseOptionalJson(row.metadataJson),
  };
}

function createRelationRecord(row: RelationRow): IAnalysisRelation | undefined {
  const filePath = readRequiredString(row.filePath);
  const kind = readRequiredString(row.kind);
  const sourceId = readRequiredString(row.sourceId);
  const fromFilePath = readRequiredString(row.fromFilePath);
  if (!filePath || !kind || !sourceId || !fromFilePath) {
    return undefined;
  }

  return {
    kind: kind as IAnalysisRelation['kind'],
    pluginId: readOptionalString(row.pluginId),
    sourceId,
    fromFilePath,
    toFilePath: readOptionalString(row.toFilePath) ?? null,
    fromNodeId: readOptionalString(row.fromNodeId),
    toNodeId: readOptionalString(row.toNodeId),
    fromSymbolId: readOptionalString(row.fromSymbolId),
    toSymbolId: readOptionalString(row.toSymbolId),
    specifier: readOptionalString(row.specifier),
    type: readOptionalString(row.relationType),
    variant: readOptionalString(row.variant),
    resolvedPath: readOptionalString(row.resolvedPath) ?? null,
    metadata: parseOptionalJson(row.metadataJson),
  };
}

export function readDatabaseSnapshot(databasePath: string): DatabaseSnapshot {
  if (!fs.existsSync(databasePath)) {
    throw new Error(`CodeGraphy database not found at ${databasePath}`);
  }

  return withReadOnlyConnection(databasePath, (connection) => {
    const fileRows = readRowsSync(connection, FILE_ROWS_QUERY) as FileRow[];
    const symbolRows = readRowsSync(connection, SYMBOL_ROWS_QUERY) as SymbolRow[];
    const relationRows = readRowsSync(connection, RELATION_ROWS_QUERY) as RelationRow[];

    return {
      files: fileRows.flatMap((row) => {
        const entry = createFileRecord(row);
        return entry ? [entry] : [];
      }),
      symbols: symbolRows.flatMap((row) => {
        const entry = createSymbolRecord(row);
        return entry ? [entry] : [];
      }),
      relations: relationRows.flatMap((row) => {
        const entry = createRelationRecord(row);
        return entry ? [entry] : [];
      }),
    };
  });
}
