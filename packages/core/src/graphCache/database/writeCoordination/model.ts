import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import Database from 'libsql';
import { AsyncLocalStorage } from 'node:async_hooks';
import { setTimeout as wait } from 'node:timers/promises';

const LOCK_SUFFIX = '.write-lock.sqlite';
const RETRY_DELAY_MS = 25;
const ACQUIRE_TIMEOUT_MS = 60_000;
const syncWaitState = new Int32Array(new SharedArrayBuffer(4));
const processLocks = new Set<string>();
const ownershipContext = new AsyncLocalStorage<ReadonlyMap<string, { active: boolean }>>();

type LockConnection = Database.Database;

interface WorkspaceCacheWriteOwnership {
  release(advanceRevision: boolean): void;
  revision: number;
}

const MISSING_PARENT_DIRECTORY = Symbol('missing-parent-directory');
type ParentDirectoryMode = 'create' | 'if-parent-exists';
type WorkspaceCacheWriteOwnershipAttempt =
  | WorkspaceCacheWriteOwnership
  | typeof MISSING_PARENT_DIRECTORY
  | undefined;

function lockPath(databasePath: string): string {
  return `${databasePath}${LOCK_SUFFIX}`;
}

function isBusyError(error: unknown): boolean {
  return error instanceof Error
    && 'code' in error
    && (error.code === 'SQLITE_BUSY' || error.code === 'SQLITE_LOCKED');
}

function isFileSystemError(error: unknown, code: string): boolean {
  return error instanceof Error
    && 'code' in error
    && error.code === code;
}

function prepareLockDirectory(
  writeLockPath: string,
  mode: ParentDirectoryMode,
): boolean {
  const directoryPath = path.dirname(writeLockPath);
  if (mode === 'create') {
    mkdirSync(directoryPath, { recursive: true });
    return true;
  }
  try {
    mkdirSync(directoryPath);
    return true;
  } catch (error) {
    if (isFileSystemError(error, 'EEXIST')) return true;
    if (isFileSystemError(error, 'ENOENT')) return false;
    throw error;
  }
}

function ensureRevisionState(connection: LockConnection): void {
  connection.exec(`
    CREATE TABLE IF NOT EXISTS CacheWriteState (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      revision INTEGER NOT NULL
    ) STRICT;
    INSERT OR IGNORE INTO CacheWriteState (id, revision) VALUES (1, 0);
  `);
}

function readRevision(connection: LockConnection): number {
  const row = connection.prepare(
    'SELECT revision FROM CacheWriteState WHERE id = 1',
  ).get() as { revision?: number | bigint } | undefined;
  return Number(row?.revision ?? 0);
}

function tryAcquire(
  databasePath: string,
  parentDirectoryMode: ParentDirectoryMode = 'create',
): WorkspaceCacheWriteOwnershipAttempt {
  const writeLockPath = lockPath(databasePath);
  if (!prepareLockDirectory(writeLockPath, parentDirectoryMode)) {
    return MISSING_PARENT_DIRECTORY;
  }
  let connection: LockConnection;
  try {
    connection = new Database(writeLockPath);
  } catch (error) {
    if (
      parentDirectoryMode === 'if-parent-exists'
      && !existsSync(path.dirname(writeLockPath))
    ) {
      return MISSING_PARENT_DIRECTORY;
    }
    throw error;
  }
  try {
    connection.pragma('busy_timeout = 0');
    ensureRevisionState(connection);
    connection.exec('BEGIN EXCLUSIVE');
    const revision = readRevision(connection);
    processLocks.add(writeLockPath);
    return {
      revision,
      release: (advanceRevision) => {
        try {
          if (advanceRevision) {
            connection.prepare(
              'UPDATE CacheWriteState SET revision = revision + 1 WHERE id = 1',
            ).run();
            connection.exec('COMMIT');
          } else {
            connection.exec('ROLLBACK');
          }
        } finally {
          connection.close();
          processLocks.delete(writeLockPath);
        }
      },
    };
  } catch (error) {
    connection.close();
    if (isBusyError(error)) return undefined;
    throw error;
  }
}

function timeoutError(databasePath: string): Error {
  return new Error(`Timed out waiting for another Graph Cache writer: ${databasePath}`);
}

function acquireSync(databasePath: string): WorkspaceCacheWriteOwnership {
  const writeLockPath = lockPath(databasePath);
  if (processLocks.has(writeLockPath)) {
    throw new Error(`Graph Cache writing is already active in this process: ${databasePath}`);
  }
  const deadline = Date.now() + ACQUIRE_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const ownership = tryAcquire(databasePath);
    if (ownership && ownership !== MISSING_PARENT_DIRECTORY) return ownership;
    Atomics.wait(syncWaitState, 0, 0, RETRY_DELAY_MS);
  }
  throw timeoutError(databasePath);
}

async function acquireAsync(databasePath: string): Promise<WorkspaceCacheWriteOwnership> {
  const writeLockPath = lockPath(databasePath);
  const deadline = Date.now() + ACQUIRE_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (!processLocks.has(writeLockPath)) {
      const ownership = tryAcquire(databasePath);
      if (ownership && ownership !== MISSING_PARENT_DIRECTORY) return ownership;
    }
    await wait(RETRY_DELAY_MS);
  }
  throw timeoutError(databasePath);
}

async function acquireAsyncIfParentExists(
  databasePath: string,
): Promise<WorkspaceCacheWriteOwnership | undefined> {
  const writeLockPath = lockPath(databasePath);
  const deadline = Date.now() + ACQUIRE_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (!processLocks.has(writeLockPath)) {
      const ownership = tryAcquire(databasePath, 'if-parent-exists');
      if (ownership === MISSING_PARENT_DIRECTORY) return undefined;
      if (ownership) return ownership;
    }
    await wait(RETRY_DELAY_MS);
  }
  throw timeoutError(databasePath);
}

export async function readWorkspaceCacheWriteRevisionAsync(
  databasePath: string,
): Promise<number> {
  const ownership = await acquireAsync(databasePath);
  try {
    return ownership.revision;
  } finally {
    ownership.release(false);
  }
}

export interface WorkspaceCacheWriteContext {
  markCommitted(): void;
  revision: number;
}

export function hasWorkspaceCacheWriteOwnership(databasePath: string): boolean {
  return ownershipContext.getStore()?.get(lockPath(databasePath))?.active ?? false;
}

export async function withWorkspaceCacheWriteOwnershipAsync<T>(
  databasePath: string,
  write: (context: WorkspaceCacheWriteContext) => Promise<T>,
): Promise<T> {
  const ownership = await acquireAsync(databasePath);
  let cacheCommitted = false;
  try {
    return await runWithOwnershipContext(databasePath, () => write({
      revision: ownership.revision,
      markCommitted: () => { cacheCommitted = true; },
    }));
  } finally {
    ownership.release(cacheCommitted);
  }
}

export function withWorkspaceCacheWriteLock<T>(
  databasePath: string,
  write: (revision: number) => T,
): T {
  const ownership = acquireSync(databasePath);
  let advanceRevision = false;
  try {
    const result = write(ownership.revision);
    advanceRevision = true;
    return result;
  } finally {
    ownership.release(advanceRevision);
  }
}

export async function withWorkspaceCacheWriteLockAsync<T>(
  databasePath: string,
  write: (revision: number) => Promise<T>,
): Promise<T> {
  const ownership = await acquireAsync(databasePath);
  let advanceRevision = false;
  try {
    const result = await runWithOwnershipContext(
      databasePath,
      () => write(ownership.revision),
    );
    advanceRevision = true;
    return result;
  } finally {
    ownership.release(advanceRevision);
  }
}

export async function withWorkspaceCacheWriteLockIfParentExistsAsync<T>(
  databasePath: string,
  write: (revision: number) => Promise<T>,
): Promise<T | undefined> {
  const ownership = await acquireAsyncIfParentExists(databasePath);
  if (!ownership) return undefined;
  let advanceRevision = false;
  try {
    const result = await runWithOwnershipContext(
      databasePath,
      () => write(ownership.revision),
    );
    advanceRevision = true;
    return result;
  } finally {
    ownership.release(advanceRevision);
  }
}

function runWithOwnershipContext<T>(
  databasePath: string,
  operation: () => Promise<T>,
): Promise<T> {
  const ownership = { active: true };
  const ownedPaths = new Map(ownershipContext.getStore());
  ownedPaths.set(lockPath(databasePath), ownership);
  return ownershipContext.run(ownedPaths, async () => {
    try {
      return await operation();
    } finally {
      ownership.active = false;
    }
  });
}
