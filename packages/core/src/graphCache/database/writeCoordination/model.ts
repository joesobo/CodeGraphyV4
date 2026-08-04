import { createHash } from 'node:crypto';
import {
  mkdirSync,
  realpathSync,
  statSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'libsql';
import { AsyncLocalStorage } from 'node:async_hooks';
import { setTimeout as wait } from 'node:timers/promises';

const LOCK_DIRECTORY_NAME = 'write-locks';
const RETRY_DELAY_MS = 25;
const ACQUIRE_TIMEOUT_MS = 60_000;
const syncWaitState = new Int32Array(new SharedArrayBuffer(4));
const processLocks = new Set<string>();
interface WorkspaceDirectoryIdentity {
  birthtimeNs: bigint;
  device: bigint;
  inode: bigint;
}

interface ActiveWorkspaceCacheWriteOwnership {
  active: boolean;
  directoryIdentity: WorkspaceDirectoryIdentity;
}

const ownershipContext = new AsyncLocalStorage<
  ReadonlyMap<string, ActiveWorkspaceCacheWriteOwnership>
>();

type LockConnection = Database.Database;

interface WorkspaceCacheWriteOwnership {
  release(): void;
  revision: number;
}

function canonicalDatabaseIdentity(databasePath: string): string {
  let existingPath = path.resolve(databasePath);
  const unresolvedSegments: string[] = [];
  while (true) {
    try {
      const canonicalPath = path.join(
        realpathSync.native(existingPath),
        ...unresolvedSegments,
      );
      return process.platform === 'win32'
        ? canonicalPath.toLowerCase()
        : canonicalPath;
    } catch (error) {
      if (!isFileSystemError(error, 'ENOENT')
        && !isFileSystemError(error, 'ENOTDIR')) throw error;
      const parentPath = path.dirname(existingPath);
      if (parentPath === existingPath) {
        const unresolvedPath = path.join(existingPath, ...unresolvedSegments);
        return process.platform === 'win32'
          ? unresolvedPath.toLowerCase()
          : unresolvedPath;
      }
      unresolvedSegments.unshift(path.basename(existingPath));
      existingPath = parentPath;
    }
  }
}

export function getWorkspaceCacheWriteLockPath(databasePath: string): string {
  const databaseIdentity = createHash('sha256')
    .update(canonicalDatabaseIdentity(databasePath))
    .digest('hex');
  return path.join(
    os.homedir(),
    '.codegraphy',
    LOCK_DIRECTORY_NAME,
    `${databaseIdentity}.sqlite`,
  );
}

function isFileSystemError(error: unknown, code: string): boolean {
  return error instanceof Error
    && 'code' in error
    && error.code === code;
}

function prepareDatabaseDirectoryIfParentExists(databasePath: string): boolean {
  try {
    mkdirSync(path.dirname(databasePath));
    return true;
  } catch (error) {
    if (isFileSystemError(error, 'EEXIST')) return true;
    if (isFileSystemError(error, 'ENOENT')) return false;
    throw error;
  }
}

function readDatabaseDirectoryIdentity(
  databasePath: string,
): WorkspaceDirectoryIdentity {
  return readPathIdentity(path.dirname(databasePath));
}

function readPathIdentity(targetPath: string): WorkspaceDirectoryIdentity {
  const stats = statSync(targetPath, { bigint: true });
  return {
    birthtimeNs: stats.birthtimeNs,
    device: stats.dev,
    inode: stats.ino,
  };
}

function sameDirectoryIdentity(
  left: WorkspaceDirectoryIdentity,
  right: WorkspaceDirectoryIdentity,
): boolean {
  return left.device === right.device
    && left.inode === right.inode
    && left.birthtimeNs === right.birthtimeNs;
}

export class WorkspaceCacheWriteIdentityChangedError extends Error {
  constructor(databasePath: string) {
    super(`The Graph Cache workspace changed while writing: ${databasePath}`);
    this.name = 'WorkspaceCacheWriteIdentityChangedError';
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

function readOrReserveRevision(writeLockPath: string, reserve: boolean): number {
  const connection = new Database(`${writeLockPath}.revision.sqlite`);
  try {
    ensureRevisionState(connection);
    connection.exec('BEGIN IMMEDIATE;');
    const revision = readRevision(connection);
    if (reserve) {
      connection.prepare(
        'UPDATE CacheWriteState SET revision = revision + 1 WHERE id = 1',
      ).run();
    }
    connection.exec('COMMIT;');
    return revision;
  } catch (error) {
    try {
      connection.exec('ROLLBACK;');
    } catch {
      // The transaction may not have started.
    }
    throw error;
  } finally {
    connection.close();
  }
}

function isSqliteBusyError(error: unknown): boolean {
  return error instanceof Error
    && 'code' in error
    && (error.code === 'SQLITE_BUSY' || error.code === 'SQLITE_BUSY_SNAPSHOT');
}

function tryAcquire(
  databasePath: string,
  reserveRevision: boolean,
): WorkspaceCacheWriteOwnership | undefined {
  const writeLockPath = getWorkspaceCacheWriteLockPath(databasePath);
  mkdirSync(path.dirname(writeLockPath), { recursive: true, mode: 0o700 });
  let connection: LockConnection | undefined;
  try {
    connection = new Database(writeLockPath);
    connection.exec('PRAGMA busy_timeout = 0; BEGIN EXCLUSIVE;');
    const revision = readOrReserveRevision(writeLockPath, reserveRevision);
    const acquiredConnection = connection;
    processLocks.add(writeLockPath);
    return {
      revision,
      release: () => {
        try {
          acquiredConnection.exec('ROLLBACK;');
        } finally {
          acquiredConnection.close();
          processLocks.delete(writeLockPath);
        }
      },
    };
  } catch (error) {
    connection?.close();
    if (isSqliteBusyError(error)) return undefined;
    throw error;
  }
}

function timeoutError(databasePath: string): Error {
  return new Error(`Timed out waiting for another Graph Cache writer: ${databasePath}`);
}

function acquireSync(
  databasePath: string,
  reserveRevision: boolean,
): WorkspaceCacheWriteOwnership {
  const writeLockPath = getWorkspaceCacheWriteLockPath(databasePath);
  if (processLocks.has(writeLockPath)) {
    throw new Error(`Graph Cache writing is already active in this process: ${databasePath}`);
  }
  const deadline = Date.now() + ACQUIRE_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const ownership = tryAcquire(databasePath, reserveRevision);
    if (ownership) return ownership;
    Atomics.wait(syncWaitState, 0, 0, RETRY_DELAY_MS);
  }
  throw timeoutError(databasePath);
}

async function acquireAsync(
  databasePath: string,
  reserveRevision: boolean,
): Promise<WorkspaceCacheWriteOwnership> {
  const writeLockPath = getWorkspaceCacheWriteLockPath(databasePath);
  const deadline = Date.now() + ACQUIRE_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (!processLocks.has(writeLockPath)) {
      const ownership = tryAcquire(databasePath, reserveRevision);
      if (ownership) return ownership;
    }
    await wait(RETRY_DELAY_MS);
  }
  throw timeoutError(databasePath);
}

export async function readWorkspaceCacheWriteRevisionAsync(
  databasePath: string,
): Promise<number> {
  const ownership = await acquireAsync(databasePath, false);
  try {
    return ownership.revision;
  } finally {
    ownership.release();
  }
}

export interface WorkspaceCacheWriteContext {
  assertCurrent(): void;
  revision: number;
}

export function hasWorkspaceCacheWriteOwnership(databasePath: string): boolean {
  return activeOwnershipForDatabasePath(databasePath)?.active ?? false;
}

export function assertWorkspaceCacheWriteOwnershipCurrent(
  databasePath: string,
): void {
  const ownership = activeOwnershipForDatabasePath(databasePath);
  let currentIdentity: WorkspaceDirectoryIdentity | undefined;
  try {
    currentIdentity = readDatabaseDirectoryIdentity(databasePath);
  } catch {
    currentIdentity = undefined;
  }
  if (!ownership?.active || !currentIdentity || !sameDirectoryIdentity(
    ownership.directoryIdentity,
    currentIdentity,
  )) {
    throw new WorkspaceCacheWriteIdentityChangedError(databasePath);
  }
}

export async function withWorkspaceCacheWriteOwnershipAsync<T>(
  databasePath: string,
  write: (context: WorkspaceCacheWriteContext) => Promise<T>,
): Promise<T> {
  const ownership = await acquireAsync(databasePath, true);
  let directoryIdentity: WorkspaceDirectoryIdentity | undefined;
  try {
    if (!prepareDatabaseDirectoryIfParentExists(databasePath)) {
      throw new WorkspaceCacheWriteIdentityChangedError(databasePath);
    }
    directoryIdentity = readDatabaseDirectoryIdentity(databasePath);
    const result = await runWithOwnershipContext(
      databasePath,
      directoryIdentity,
      async () => {
        const result = await write({
          revision: ownership.revision,
          assertCurrent: () => assertWorkspaceCacheWriteOwnershipCurrent(databasePath),
        });
        assertWorkspaceCacheWriteOwnershipCurrent(databasePath);
        return result;
      },
    );
    return result;
  } finally {
    ownership.release();
  }
}

export function withWorkspaceCacheWriteLock<T>(
  databasePath: string,
  write: (revision: number) => T,
): T {
  const ownership = acquireSync(databasePath, true);
  try {
    if (!prepareDatabaseDirectoryIfParentExists(databasePath)) {
      throw new WorkspaceCacheWriteIdentityChangedError(databasePath);
    }
    const directoryIdentity = readDatabaseDirectoryIdentity(databasePath);
    const result = runWithOwnershipContextSync(
      databasePath,
      directoryIdentity,
      () => {
        const result = write(ownership.revision);
        assertWorkspaceCacheWriteOwnershipCurrent(databasePath);
        return result;
      },
    );
    return result;
  } finally {
    ownership.release();
  }
}

export async function withWorkspaceCacheWriteLockAsync<T>(
  databasePath: string,
  write: (revision: number) => Promise<T>,
): Promise<T> {
  const ownership = await acquireAsync(databasePath, true);
  try {
    if (!prepareDatabaseDirectoryIfParentExists(databasePath)) {
      throw new WorkspaceCacheWriteIdentityChangedError(databasePath);
    }
    const directoryIdentity = readDatabaseDirectoryIdentity(databasePath);
    const result = await runWithOwnershipContext(
      databasePath,
      directoryIdentity,
      async () => {
        const result = await write(ownership.revision);
        assertWorkspaceCacheWriteOwnershipCurrent(databasePath);
        return result;
      },
    );
    return result;
  } finally {
    ownership.release();
  }
}

export async function withWorkspaceCacheWriteLockIfParentExistsAsync<T>(
  databasePath: string,
  write: (revision: number) => Promise<T>,
): Promise<T | undefined> {
  const ownership = await acquireAsync(databasePath, true);
  try {
    if (!prepareDatabaseDirectoryIfParentExists(databasePath)) return undefined;
    const directoryIdentity = readDatabaseDirectoryIdentity(databasePath);
    const result = await runWithOwnershipContext(
      databasePath,
      directoryIdentity,
      async () => {
        const result = await write(ownership.revision);
        assertWorkspaceCacheWriteOwnershipCurrent(databasePath);
        return result;
      },
    );
    return result;
  } finally {
    ownership.release();
  }
}

function runWithOwnershipContext<T>(
  databasePath: string,
  directoryIdentity: WorkspaceDirectoryIdentity,
  operation: () => Promise<T>,
): Promise<T> {
  const ownership = { active: true, directoryIdentity };
  const ownedPaths = new Map(ownershipContext.getStore());
  setOwnershipKeys(ownedPaths, databasePath, ownership);
  return ownershipContext.run(ownedPaths, async () => {
    try {
      return await operation();
    } finally {
      ownership.active = false;
    }
  });
}

function runWithOwnershipContextSync<T>(
  databasePath: string,
  directoryIdentity: WorkspaceDirectoryIdentity,
  operation: () => T,
): T {
  const ownership = { active: true, directoryIdentity };
  const ownedPaths = new Map(ownershipContext.getStore());
  setOwnershipKeys(ownedPaths, databasePath, ownership);
  return ownershipContext.run(ownedPaths, () => {
    try {
      return operation();
    } finally {
      ownership.active = false;
    }
  });
}

function lexicalDatabaseIdentity(databasePath: string): string {
  const resolvedPath = path.resolve(databasePath);
  return process.platform === 'win32' ? resolvedPath.toLowerCase() : resolvedPath;
}

function ownershipRequestKey(databasePath: string): string {
  return `request:${lexicalDatabaseIdentity(databasePath)}`;
}

function ownershipLockKey(databasePath: string): string {
  return `lock:${getWorkspaceCacheWriteLockPath(databasePath)}`;
}

function activeOwnershipForDatabasePath(
  databasePath: string,
): ActiveWorkspaceCacheWriteOwnership | undefined {
  const ownedPaths = ownershipContext.getStore();
  return ownedPaths?.get(ownershipRequestKey(databasePath))
    ?? ownedPaths?.get(ownershipLockKey(databasePath));
}

function setOwnershipKeys(
  ownedPaths: Map<string, ActiveWorkspaceCacheWriteOwnership>,
  databasePath: string,
  ownership: ActiveWorkspaceCacheWriteOwnership,
): void {
  ownedPaths.set(ownershipRequestKey(databasePath), ownership);
  ownedPaths.set(ownershipLockKey(databasePath), ownership);
}
