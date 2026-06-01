import type * as lb from '@ladybugdb/core';
import type { IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import type { IWorkspaceAnalysisCache } from '../../../analysis/cache';
import { runStatementSync } from '../io/connection';
import { createRelationStatement } from '../relation/statement';

function escapeCypherString(value: string): string {
  return JSON.stringify(value);
}

function serializeJson(value: unknown): string {
  return JSON.stringify(value ?? null);
}

function createFileAnalysisStatement(
  filePath: string,
  entry: IWorkspaceAnalysisCache['files'][string],
): string {
  return `CREATE (entry:FileAnalysis {filePath: ${escapeCypherString(filePath)}, mtime: ${entry.mtime}, size: ${entry.size ?? 0}, analysis: ${escapeCypherString(JSON.stringify(entry.analysis))}})`;
}

function createSymbolStatement(symbol: IAnalysisSymbol): string {
  return `CREATE (entry:Symbol {symbolId: ${escapeCypherString(symbol.id)}, filePath: ${escapeCypherString(symbol.filePath)}, name: ${escapeCypherString(symbol.name)}, kind: ${escapeCypherString(symbol.kind)}, signature: ${escapeCypherString(symbol.signature ?? '')}, rangeJson: ${escapeCypherString(serializeJson(symbol.range))}, metadataJson: ${escapeCypherString(serializeJson(symbol.metadata))}})`;
}

export function sortedCacheEntries(
  cache: IWorkspaceAnalysisCache,
): Array<[string, IWorkspaceAnalysisCache['files'][string]]> {
  return Object.entries(cache.files).sort(([left], [right]) => left.localeCompare(right));
}

export function persistAnalysisEntry(
  connection: lb.Connection,
  filePath: string,
  entry: IWorkspaceAnalysisCache['files'][string],
): void {
  runStatementSync(connection, createFileAnalysisStatement(filePath, entry));

  for (const symbol of entry.analysis.symbols ?? []) {
    runStatementSync(connection, createSymbolStatement(symbol));
  }

  for (const [relationIndex, relation] of (entry.analysis.relations ?? []).entries()) {
    runStatementSync(connection, createRelationStatement(filePath, relation, relationIndex));
  }
}

async function runStatementAndYield(
  connection: lb.Connection,
  statement: string,
  afterStatement: () => Promise<void>,
): Promise<void> {
  runStatementSync(connection, statement);
  await afterStatement();
}

export async function persistAnalysisEntryAsync(
  connection: lb.Connection,
  filePath: string,
  entry: IWorkspaceAnalysisCache['files'][string],
  afterStatement: () => Promise<void>,
): Promise<void> {
  await runStatementAndYield(connection, createFileAnalysisStatement(filePath, entry), afterStatement);

  for (const symbol of entry.analysis.symbols ?? []) {
    await runStatementAndYield(connection, createSymbolStatement(symbol), afterStatement);
  }

  for (const [relationIndex, relation] of (entry.analysis.relations ?? []).entries()) {
    await runStatementAndYield(
      connection,
      createRelationStatement(filePath, relation, relationIndex),
      afterStatement,
    );
  }
}
