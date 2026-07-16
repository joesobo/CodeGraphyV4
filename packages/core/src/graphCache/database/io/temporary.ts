import * as fs from 'node:fs';

const DATABASE_SIDECAR_SUFFIXES = ['-wal', '-shm', '-journal'];

type DatabaseFileSystem = Pick<typeof fs, 'existsSync' | 'renameSync' | 'rmSync'>;

interface DatabaseFileMove {
  sourcePath: string;
  targetPath: string;
}

function getDatabaseSidecarPaths(databasePath: string): string[] {
  return DATABASE_SIDECAR_SUFFIXES.map(suffix => `${databasePath}${suffix}`);
}

function removePathIfPresent(
  filePath: string,
  fileSystem: DatabaseFileSystem = fs,
): void {
  if (fileSystem.existsSync(filePath)) {
    fileSystem.rmSync(filePath, { force: true });
  }
}

function cleanupDatabaseFilesBestEffort(
  databasePath: string,
  fileSystem: DatabaseFileSystem,
): void {
  for (const filePath of [databasePath, ...getDatabaseSidecarPaths(databasePath)]) {
    try {
      removePathIfPresent(filePath, fileSystem);
    } catch {
      // Cleanup must not replace the actionable cache replacement error.
    }
  }
}

function moveDatabaseFiles(
  sourceDatabasePath: string,
  targetDatabasePath: string,
  fileSystem: DatabaseFileSystem,
  moves: DatabaseFileMove[],
): void {
  const sourcePaths = [sourceDatabasePath, ...getDatabaseSidecarPaths(sourceDatabasePath)];
  const targetPaths = [targetDatabasePath, ...getDatabaseSidecarPaths(targetDatabasePath)];

  for (let index = 0; index < sourcePaths.length; index += 1) {
    if (fileSystem.existsSync(sourcePaths[index])) {
      fileSystem.renameSync(sourcePaths[index], targetPaths[index]);
      moves.push({
        sourcePath: sourcePaths[index],
        targetPath: targetPaths[index],
      });
    }
  }
}

function moveRequiredDatabaseFiles(
  sourceDatabasePath: string,
  targetDatabasePath: string,
  fileSystem: DatabaseFileSystem,
  moves: DatabaseFileMove[],
): void {
  fileSystem.renameSync(sourceDatabasePath, targetDatabasePath);
  moves.push({ sourcePath: sourceDatabasePath, targetPath: targetDatabasePath });
  const sourceSidecars = getDatabaseSidecarPaths(sourceDatabasePath);
  const targetSidecars = getDatabaseSidecarPaths(targetDatabasePath);

  for (let index = 0; index < sourceSidecars.length; index += 1) {
    if (fileSystem.existsSync(sourceSidecars[index])) {
      fileSystem.renameSync(sourceSidecars[index], targetSidecars[index]);
      moves.push({
        sourcePath: sourceSidecars[index],
        targetPath: targetSidecars[index],
      });
    }
  }
}

function rollbackDatabaseFileMoves(
  moves: readonly DatabaseFileMove[],
  fileSystem: DatabaseFileSystem,
): void {
  for (const move of [...moves].reverse()) {
    if (fileSystem.existsSync(move.targetPath) && !fileSystem.existsSync(move.sourcePath)) {
      try {
        fileSystem.renameSync(move.targetPath, move.sourcePath);
      } catch {
        // Preserve the original replacement failure and leave recoverable files in place.
      }
    }
  }
}

export function createTemporaryDatabasePath(databasePath: string): string {
  return `${databasePath}.${process.pid}.${Date.now()}.tmp`;
}

export function replaceDatabaseCache(
  tempDatabasePath: string,
  databasePath: string,
  fileSystem: DatabaseFileSystem = fs,
): void {
  const backupDatabasePath = `${databasePath}.${process.pid}.${Date.now()}.backup`;
  const previousDatabaseMoves: DatabaseFileMove[] = [];
  const replacementMoves: DatabaseFileMove[] = [];
  let replacementSucceeded = false;

  try {
    moveDatabaseFiles(
      databasePath,
      backupDatabasePath,
      fileSystem,
      previousDatabaseMoves,
    );
    moveRequiredDatabaseFiles(
      tempDatabasePath,
      databasePath,
      fileSystem,
      replacementMoves,
    );
    replacementSucceeded = true;
  } catch (error) {
    rollbackDatabaseFileMoves(replacementMoves, fileSystem);
    rollbackDatabaseFileMoves(previousDatabaseMoves, fileSystem);
    throw error;
  } finally {
    if (replacementSucceeded) {
      cleanupDatabaseFilesBestEffort(backupDatabasePath, fileSystem);
    }
  }
}

export function cleanupTemporaryDatabase(
  tempDatabasePath: string,
  fileSystem: DatabaseFileSystem = fs,
): void {
  for (const temporaryPath of [tempDatabasePath, ...getDatabaseSidecarPaths(tempDatabasePath)]) {
    removePathIfPresent(temporaryPath, fileSystem);
  }
}
