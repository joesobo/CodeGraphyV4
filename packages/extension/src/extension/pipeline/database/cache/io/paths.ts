import * as fs from 'node:fs';
import * as path from 'node:path';

const DATABASE_DIRECTORY_NAME = '.codegraphy';
const DATABASE_FILE_NAME = 'graph.lbug';

export function ensureDatabaseDirectory(workspaceRoot: string): void {
  if (!fs.existsSync(workspaceRoot)) {
    return;
  }

  fs.mkdirSync(path.join(workspaceRoot, DATABASE_DIRECTORY_NAME), { recursive: true });
}

export function getWorkspaceAnalysisDatabasePath(workspaceRoot: string): string {
  return path.join(workspaceRoot, DATABASE_DIRECTORY_NAME, DATABASE_FILE_NAME);
}

export function clearDatabaseArtifacts(databasePath: string): void {
  for (const filePath of [databasePath, `${databasePath}.wal`]) {
    try {
      fs.rmSync(filePath, { force: true });
    } catch {
      // Best effort only.
    }
  }
}
