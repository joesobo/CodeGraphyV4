import * as fs from 'node:fs';

const DATABASE_SIDECAR_SUFFIXES = ['-wal', '-shm', '-journal'];

function getDatabaseSidecarPaths(databasePath: string): string[] {
  return DATABASE_SIDECAR_SUFFIXES.map(suffix => `${databasePath}${suffix}`);
}

function removePathIfPresent(filePath: string): void {
  if (fs.existsSync(filePath)) {
    fs.rmSync(filePath, { force: true });
  }
}

export function createTemporaryDatabasePath(databasePath: string): string {
  return `${databasePath}.${process.pid}.${Date.now()}.tmp`;
}

export function replaceDatabaseCache(tempDatabasePath: string, databasePath: string): void {
  for (const databaseSidecarPath of getDatabaseSidecarPaths(databasePath)) {
    removePathIfPresent(databaseSidecarPath);
  }

  fs.renameSync(tempDatabasePath, databasePath);

  for (const suffix of DATABASE_SIDECAR_SUFFIXES) {
    const tempSidecarPath = `${tempDatabasePath}${suffix}`;
    if (fs.existsSync(tempSidecarPath)) {
      fs.renameSync(tempSidecarPath, `${databasePath}${suffix}`);
    }
  }
}

export function cleanupTemporaryDatabase(tempDatabasePath: string): void {
  for (const temporaryPath of [tempDatabasePath, ...getDatabaseSidecarPaths(tempDatabasePath)]) {
    removePathIfPresent(temporaryPath);
  }
}
