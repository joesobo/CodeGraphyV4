import type * as lb from '@ladybugdb/core';
import { runStatementAsync, runStatementSync } from './connection';

export function ensureSchema(connection: lb.Connection): void {
  runStatementSync(
    connection,
    'CREATE NODE TABLE IF NOT EXISTS FileAnalysis(filePath STRING PRIMARY KEY, mtime INT64, size INT64, analysis STRING)',
  );
  runStatementSync(
    connection,
    'CREATE NODE TABLE IF NOT EXISTS Symbol(symbolId STRING PRIMARY KEY, filePath STRING, name STRING, kind STRING, signature STRING, rangeJson STRING, metadataJson STRING)',
  );
  runStatementSync(
    connection,
    'CREATE NODE TABLE IF NOT EXISTS Relation(relationId STRING PRIMARY KEY, filePath STRING, kind STRING, pluginId STRING, sourceId STRING, fromFilePath STRING, toFilePath STRING, fromNodeId STRING, toNodeId STRING, fromSymbolId STRING, toSymbolId STRING, specifier STRING, relationType STRING, variant STRING, resolvedPath STRING, metadataJson STRING)',
  );
}

export async function ensureSchemaAsync(connection: lb.Connection): Promise<void> {
  await runStatementAsync(
    connection,
    'CREATE NODE TABLE IF NOT EXISTS FileAnalysis(filePath STRING PRIMARY KEY, mtime INT64, size INT64, analysis STRING)',
  );
  await runStatementAsync(
    connection,
    'CREATE NODE TABLE IF NOT EXISTS Symbol(symbolId STRING PRIMARY KEY, filePath STRING, name STRING, kind STRING, signature STRING, rangeJson STRING, metadataJson STRING)',
  );
  await runStatementAsync(
    connection,
    'CREATE NODE TABLE IF NOT EXISTS Relation(relationId STRING PRIMARY KEY, filePath STRING, kind STRING, pluginId STRING, sourceId STRING, fromFilePath STRING, toFilePath STRING, fromNodeId STRING, toNodeId STRING, fromSymbolId STRING, toSymbolId STRING, specifier STRING, relationType STRING, variant STRING, resolvedPath STRING, metadataJson STRING)',
  );
}
