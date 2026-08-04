import { createHash, randomUUID } from 'node:crypto';
import {
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'libsql';
import { AsyncLocalStorage } from 'node:async_hooks';
import { setTimeout as wait } from 'node:timers/promises';

const LOCK_DIRECTORY_NAME = 'write-locks';
const RETRY_DELAY_MS = 25;
const ACQUIRE_TIMEOUT_MS = 60_000;
const INCOMPLETE_OWNER_GRACE_MS = 1_000;
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
  release(advanceRevision: boolean): void;
  revision: number;
}

interface ProcessLockOwner {
  pid: number;
  token: string;
}

interface ProcessLockOwnership {
  release(): void;
}

function canonicalDatabaseIdentity(databasePath: string): string {
  const resolvedPath = path.resolve(databasePath);
  return process.platform === 'win32' ? resolvedPath.toLowerCase() : resolvedPath;
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

function processLockDirectoryPath(writeLockPath: string): string {
  return `${writeLockPath}.owner`;
}

function readProcessLockOwner(directoryPath: string): ProcessLockOwner | undefined {
  try {
    const value = JSON.parse(
      readFileSync(path.join(directoryPath, 'owner.json'), 'utf8'),
    ) as Partial<ProcessLockOwner>;
    return Number.isInteger(value.pid) && typeof value.token === 'string'
      ? { pid: value.pid!, token: value.token }
      : undefined;
  } catch {
    return undefined;
  }
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return !isFileSystemError(error, 'ESRCH');
  }
}

function removeAbandonedProcessLock(directoryPath: string): void {
  const owner = readProcessLockOwner(directoryPath);
  let incompleteOwnerIsRecent = false;
  if (!owner) {
    try {
      incompleteOwnerIsRecent = Date.now() - statSync(directoryPath).mtimeMs
        < INCOMPLETE_OWNER_GRACE_MS;
    } catch (error) {
      if (isFileSystemError(error, 'ENOENT')) return;
      throw error;
    }
  }
  if (owner ? isProcessAlive(owner.pid) : incompleteOwnerIsRecent) {
    return;
  }
  const abandonedPath = `${directoryPath}.abandoned.${randomUUID()}`;
  try {
    renameSync(directoryPath, abandonedPath);
  } catch (error) {
    if (isFileSystemError(error, 'ENOENT')) return;
    throw error;
  }
  rmSync(abandonedPath, { recursive: true, force: true });
}

function tryAcquireProcessLock(writeLockPath: string): ProcessLockOwnership | undefined {
  const directoryPath = processLockDirectoryPath(writeLockPath);
  try {
    mkdirSync(directoryPath);
  } catch (error) {
    if (!isFileSystemError(error, 'EEXIST')) throw error;
    removeAbandonedProcessLock(directoryPath);
    return undefined;
  }
  const owner = { pid: process.pid, token: randomUUID() };
  try {
    writeFileSync(
      path.join(directoryPath, 'owner.json'),
      JSON.stringify(owner),
      { encoding: 'utf8', flag: 'wx' },
    );
  } catch (error) {
    rmSync(directoryPath, { recursive: true, force: true });
    throw error;
  }
  return {
    release: () => {
      if (readProcessLockOwner(directoryPath)?.token === owner.token) {
        rmSync(directoryPath, { recursive: true, force: true });
      }
    },
  };
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
  const stats = statSync(path.dirname(databasePath), { bigint: true });
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

function tryAcquire(databasePath: string): WorkspaceCacheWriteOwnership | undefined {
  const writeLockPath = getWorkspaceCacheWriteLockPath(databasePath);
  mkdirSync(path.dirname(writeLockPath), { recursive: true, mode: 0o700 });
  const processLock = tryAcquireProcessLock(writeLockPath);
  if (!processLock) return undefined;
  let connection: LockConnection | undefined;
  try {
    connection = new Database(writeLockPath);
    ensureRevisionState(connection);
    const revision = readRevision(connection);
    const acquiredConnection = connection;
    processLocks.add(writeLockPath);
    return {
      revision,
      release: (advanceRevision) => {
        try {
          if (advanceRevision) {
            acquiredConnection.prepare(
              'UPDATE CacheWriteState SET revision = revision + 1 WHERE id = 1',
            ).run();
          }
        } finally {
          acquiredConnection.close();
          processLocks.delete(writeLockPath);
          processLock.release();
        }
      },
    };
  } catch (error) {
    connection?.close();
    processLock.release();
    throw error;
  }
}

function timeoutError(databasePath: string): Error {
  return new Error(`Timed out waiting for another Graph Cache writer: ${databasePath}`);
}

function acquireSync(databasePath: string): WorkspaceCacheWriteOwnership {
  const writeLockPath = getWorkspaceCacheWriteLockPath(databasePath);
  if (processLocks.has(writeLockPath)) {
    throw new Error(`Graph Cache writing is already active in this process: ${databasePath}`);
  }
  const deadline = Date.now() + ACQUIRE_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const ownership = tryAcquire(databasePath);
    if (ownership) return ownership;
    Atomics.wait(syncWaitState, 0, 0, RETRY_DELAY_MS);
  }
  throw timeoutError(databasePath);
}

async function acquireAsync(databasePath: string): Promise<WorkspaceCacheWriteOwnership> {
  const writeLockPath = getWorkspaceCacheWriteLockPath(databasePath);
  const deadline = Date.now() + ACQUIRE_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (!processLocks.has(writeLockPath)) {
      const ownership = tryAcquire(databasePath);
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
  assertCurrent(): void;
  markCommitted(): void;
  revision: number;
}

export function hasWorkspaceCacheWriteOwnership(databasePath: string): boolean {
  return ownershipContext.getStore()
    ?.get(getWorkspaceCacheWriteLockPath(databasePath))?.active ?? false;
}

export function assertWorkspaceCacheWriteOwnershipCurrent(
  databasePath: string,
): void {
  const ownership = ownershipContext.getStore()
    ?.get(getWorkspaceCacheWriteLockPath(databasePath));
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
  const ownership = await acquireAsync(databasePath);
  let operationCommitted = false;
  let releaseCommitted = false;
  let directoryIdentity: WorkspaceDirectoryIdentity | undefined;
  try {
    if (!prepareDatabaseDirectoryIfParentExists(databasePath)) {
      throw new WorkspaceCacheWriteIdentityChangedError(databasePath);
    }
    directoryIdentity = readDatabaseDirectoryIdentity(databasePath);
    const result = await runWithOwnershipContext(
      databasePath,
      directoryIdentity,
      () => write({
        revision: ownership.revision,
        assertCurrent: () => assertWorkspaceCacheWriteOwnershipCurrent(databasePath),
        markCommitted: () => { operationCommitted = true; },
      }),
    );
    assertDirectoryIdentityCurrent(databasePath, directoryIdentity);
    return result;
  } finally {
    try {
      if (operationCommitted && directoryIdentity) {
        assertDirectoryIdentityCurrent(databasePath, directoryIdentity);
        releaseCommitted = true;
      }
    } finally {
      ownership.release(releaseCommitted);
    }
  }
}

export function withWorkspaceCacheWriteLock<T>(
  databasePath: string,
  write: (revision: number) => T,
): T {
  const ownership = acquireSync(databasePath);
  let advanceRevision = false;
  try {
    if (!prepareDatabaseDirectoryIfParentExists(databasePath)) {
      throw new WorkspaceCacheWriteIdentityChangedError(databasePath);
    }
    const directoryIdentity = readDatabaseDirectoryIdentity(databasePath);
    const result = runWithOwnershipContextSync(
      databasePath,
      directoryIdentity,
      () => write(ownership.revision),
    );
    assertDirectoryIdentityCurrent(databasePath, directoryIdentity);
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
    if (!prepareDatabaseDirectoryIfParentExists(databasePath)) {
      throw new WorkspaceCacheWriteIdentityChangedError(databasePath);
    }
    const directoryIdentity = readDatabaseDirectoryIdentity(databasePath);
    const result = await runWithOwnershipContext(
      databasePath,
      directoryIdentity,
      () => write(ownership.revision),
    );
    assertDirectoryIdentityCurrent(databasePath, directoryIdentity);
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
  const ownership = await acquireAsync(databasePath);
  let advanceRevision = false;
  try {
    if (!prepareDatabaseDirectoryIfParentExists(databasePath)) return undefined;
    const directoryIdentity = readDatabaseDirectoryIdentity(databasePath);
    const result = await runWithOwnershipContext(
      databasePath,
      directoryIdentity,
      () => write(ownership.revision),
    );
    assertDirectoryIdentityCurrent(databasePath, directoryIdentity);
    advanceRevision = true;
    return result;
  } finally {
    ownership.release(advanceRevision);
  }
}

function assertDirectoryIdentityCurrent(
  databasePath: string,
  expectedIdentity: WorkspaceDirectoryIdentity,
): void {
  let currentIdentity: WorkspaceDirectoryIdentity | undefined;
  try {
    currentIdentity = readDatabaseDirectoryIdentity(databasePath);
  } catch {
    currentIdentity = undefined;
  }
  if (!currentIdentity || !sameDirectoryIdentity(expectedIdentity, currentIdentity)) {
    throw new WorkspaceCacheWriteIdentityChangedError(databasePath);
  }
}

function runWithOwnershipContext<T>(
  databasePath: string,
  directoryIdentity: WorkspaceDirectoryIdentity,
  operation: () => Promise<T>,
): Promise<T> {
  const ownership = { active: true, directoryIdentity };
  const ownedPaths = new Map(ownershipContext.getStore());
  ownedPaths.set(getWorkspaceCacheWriteLockPath(databasePath), ownership);
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
  ownedPaths.set(getWorkspaceCacheWriteLockPath(databasePath), ownership);
  return ownershipContext.run(ownedPaths, () => {
    try {
      return operation();
    } finally {
      ownership.active = false;
    }
  });
}
