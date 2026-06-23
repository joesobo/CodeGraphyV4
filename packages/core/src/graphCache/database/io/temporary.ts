import * as fs from 'node:fs';

export function createTemporaryDatabasePath(databasePath: string): string {
  return `${databasePath}.${process.pid}.${Date.now()}.tmp`;
}

export function replaceDatabaseCache(tempDatabasePath: string, databasePath: string): void {
  fs.renameSync(tempDatabasePath, databasePath);
}

export function cleanupTemporaryDatabase(tempDatabasePath: string): void {
  if (fs.existsSync(tempDatabasePath)) {
    fs.rmSync(tempDatabasePath, { force: true });
  }
}
