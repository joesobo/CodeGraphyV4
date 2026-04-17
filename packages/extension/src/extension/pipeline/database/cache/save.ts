import * as fs from 'node:fs';
import * as path from 'node:path';
import type { IWorkspaceAnalysisCache } from '../../cache';
import { runStatementSync, withConnection } from './connection';
import { ensureDatabaseDirectory, getWorkspaceAnalysisDatabasePath } from './paths';
import { persistAnalysisEntry, sortedCacheEntries } from './writeStatements';

export function saveWorkspaceAnalysisDatabaseCache(
  workspaceRoot: string,
  cache: IWorkspaceAnalysisCache,
): void {
  ensureDatabaseDirectory(workspaceRoot);
  const databasePath = getWorkspaceAnalysisDatabasePath(workspaceRoot);
  if (!fs.existsSync(path.dirname(databasePath))) {
    return;
  }

  withConnection(databasePath, (connection) => {
    runStatementSync(connection, 'MATCH (entry:FileAnalysis) DELETE entry');
    runStatementSync(connection, 'MATCH (entry:Symbol) DELETE entry');
    runStatementSync(connection, 'MATCH (entry:Relation) DELETE entry');

    for (const [filePath, entry] of sortedCacheEntries(cache)) {
      persistAnalysisEntry(connection, filePath, entry);
    }
  });
}

export function clearWorkspaceAnalysisDatabaseCache(workspaceRoot: string): void {
  const databasePath = getWorkspaceAnalysisDatabasePath(workspaceRoot);
  if (!fs.existsSync(databasePath)) {
    return;
  }

  withConnection(databasePath, (connection) => {
    runStatementSync(connection, 'MATCH (entry:FileAnalysis) DELETE entry');
    runStatementSync(connection, 'MATCH (entry:Symbol) DELETE entry');
    runStatementSync(connection, 'MATCH (entry:Relation) DELETE entry');
  });
}
