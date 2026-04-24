import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { Connection, Database } from '@ladybugdb/core';
import type { IAnalysisRelation, IAnalysisSymbol } from '@codegraphy-vscode/plugin-api';
import type { DatabaseSnapshot } from '../../src/database/model';

function escapeCypherString(value: string): string {
  return JSON.stringify(value);
}

function serializeJson(value: unknown): string {
  return JSON.stringify(value ?? null);
}

function runStatement(connection: Connection, statement: string): void {
  const result = connection.querySync(statement);
  const queryResults = Array.isArray(result) ? result : [result];

  for (const queryResult of queryResults) {
    try {
      (queryResult as { close?(): void }).close?.();
    } catch {
      // Best effort only.
    }
  }
}

function createRelationStatement(relation: IAnalysisRelation, index: number): string {
  const relationId = [
    relation.fromFilePath,
    relation.kind,
    relation.sourceId,
    relation.fromSymbolId ?? '',
    relation.toSymbolId ?? '',
    relation.toFilePath ?? '',
    String(index),
  ].join('|');

  return `CREATE (entry:Relation {relationId: ${escapeCypherString(relationId)}, filePath: ${escapeCypherString(relation.fromFilePath)}, kind: ${escapeCypherString(relation.kind)}, pluginId: ${escapeCypherString(relation.pluginId ?? '')}, sourceId: ${escapeCypherString(relation.sourceId)}, fromFilePath: ${escapeCypherString(relation.fromFilePath)}, toFilePath: ${escapeCypherString(relation.toFilePath ?? '')}, fromNodeId: ${escapeCypherString(relation.fromNodeId ?? '')}, toNodeId: ${escapeCypherString(relation.toNodeId ?? '')}, fromSymbolId: ${escapeCypherString(relation.fromSymbolId ?? '')}, toSymbolId: ${escapeCypherString(relation.toSymbolId ?? '')}, specifier: ${escapeCypherString(relation.specifier ?? '')}, relationType: ${escapeCypherString(relation.type ?? '')}, variant: ${escapeCypherString(relation.variant ?? '')}, resolvedPath: ${escapeCypherString(relation.resolvedPath ?? '')}, metadataJson: ${escapeCypherString(serializeJson(relation.metadata))}})`;
}

function createSymbolStatement(symbol: IAnalysisSymbol): string {
  return `CREATE (entry:Symbol {symbolId: ${escapeCypherString(symbol.id)}, filePath: ${escapeCypherString(symbol.filePath)}, name: ${escapeCypherString(symbol.name)}, kind: ${escapeCypherString(symbol.kind)}, signature: ${escapeCypherString(symbol.signature ?? '')}, rangeJson: ${escapeCypherString(serializeJson(symbol.range))}, metadataJson: ${escapeCypherString(serializeJson(symbol.metadata))}})`;
}

function createFileStatement(filePath: string, mtime = 1, size = 1): string {
  return `CREATE (entry:FileAnalysis {filePath: ${escapeCypherString(filePath)}, mtime: ${mtime}, size: ${size}, analysis: ${escapeCypherString(JSON.stringify({ filePath }))}})`;
}

export interface RepoFixture {
  workspaceRoot: string;
  databasePath: string;
}

export interface CreateTempRepoOptions {
  absoluteRelationPaths?: boolean;
  absoluteSymbolPaths?: boolean;
}

function toWorkspacePath(workspaceRoot: string, filePath: string | null | undefined): string | null | undefined {
  if (!filePath) {
    return filePath ?? undefined;
  }

  return path.join(workspaceRoot, filePath);
}

export function createTempRepo(
  snapshot: Partial<DatabaseSnapshot> = {},
  options: CreateTempRepoOptions = {},
): RepoFixture {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-repo-'));
  const databaseDirectory = path.join(workspaceRoot, '.codegraphy');
  const databasePath = path.join(databaseDirectory, 'graph.lbug');
  fs.mkdirSync(databaseDirectory, { recursive: true });
  const symbols = options.absoluteSymbolPaths
    ? (snapshot.symbols ?? []).map((symbol) => ({
      ...symbol,
      filePath: toWorkspacePath(workspaceRoot, symbol.filePath) ?? symbol.filePath,
    }))
    : (snapshot.symbols ?? []);
  const relations = options.absoluteRelationPaths
    ? (snapshot.relations ?? []).map((relation) => ({
      ...relation,
      fromFilePath: toWorkspacePath(workspaceRoot, relation.fromFilePath) ?? relation.fromFilePath,
      toFilePath: toWorkspacePath(workspaceRoot, relation.toFilePath) ?? relation.toFilePath,
      resolvedPath: toWorkspacePath(workspaceRoot, relation.resolvedPath) ?? relation.resolvedPath,
    }))
    : (snapshot.relations ?? []);

  const database = new Database(databasePath);
  const connection = new Connection(database);

  try {
    connection.initSync();
    runStatement(connection, 'CREATE NODE TABLE FileAnalysis(filePath STRING PRIMARY KEY, mtime INT64, size INT64, analysis STRING)');
    runStatement(connection, 'CREATE NODE TABLE Symbol(symbolId STRING PRIMARY KEY, filePath STRING, name STRING, kind STRING, signature STRING, rangeJson STRING, metadataJson STRING)');
    runStatement(connection, 'CREATE NODE TABLE Relation(relationId STRING PRIMARY KEY, filePath STRING, kind STRING, pluginId STRING, sourceId STRING, fromFilePath STRING, toFilePath STRING, fromNodeId STRING, toNodeId STRING, fromSymbolId STRING, toSymbolId STRING, specifier STRING, relationType STRING, variant STRING, resolvedPath STRING, metadataJson STRING)');

    const filePaths = new Set<string>(snapshot.files?.map((file) => file.filePath) ?? []);
    for (const symbol of symbols) {
      filePaths.add(symbol.filePath);
    }
    for (const relation of relations) {
      filePaths.add(relation.fromFilePath);
      if (relation.toFilePath) {
        filePaths.add(relation.toFilePath);
      }
    }

    for (const filePath of filePaths) {
      runStatement(connection, createFileStatement(filePath));
    }

    for (const symbol of symbols) {
      runStatement(connection, createSymbolStatement(symbol));
    }

    for (const [index, relation] of relations.entries()) {
      runStatement(connection, createRelationStatement(relation, index));
    }
  } finally {
    connection.closeSync();
    database.closeSync();
  }

  return { workspaceRoot, databasePath };
}

export function createTempCodeGraphyHome(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-home-'));
}

export function appendRelationToRepo(repo: RepoFixture, relation: IAnalysisRelation): void {
  const database = new Database(repo.databasePath);
  const connection = new Connection(database);

  try {
    connection.initSync();
    runStatement(connection, createRelationStatement(relation, Date.now()));
  } finally {
    connection.closeSync();
    database.closeSync();
  }
}

export function writeRepoSettings(repo: RepoFixture, settings: Record<string, unknown>): void {
  fs.writeFileSync(
    path.join(repo.workspaceRoot, '.codegraphy', 'settings.json'),
    JSON.stringify(settings, null, 2),
    'utf8',
  );
}
