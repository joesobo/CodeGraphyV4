import * as fs from 'node:fs';
import { getCodeGraphyDirectoryPath, getGraphCachePath } from '../../../workspace/paths';

export function ensureDatabaseDirectory(workspaceRoot: string): void {
  if (!fs.existsSync(workspaceRoot)) {
    return;
  }

  fs.mkdirSync(getCodeGraphyDirectoryPath(workspaceRoot), { recursive: true });
}

export function getWorkspaceAnalysisDatabasePath(workspaceRoot: string): string {
  return getGraphCachePath(workspaceRoot);
}

export function clearDatabaseArtifacts(databasePath: string): void {
  for (const filePath of [databasePath, `${databasePath}-wal`, `${databasePath}-shm`, `${databasePath}-journal`]) {
    try {
      fs.rmSync(filePath, { force: true });
    } catch {
      // Best effort only.
    }
  }
}
