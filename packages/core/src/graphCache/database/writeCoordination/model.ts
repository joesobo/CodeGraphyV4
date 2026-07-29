import { mkdirSync } from 'node:fs';
import path from 'node:path';
import Database from 'libsql';
import { setTimeout as wait } from 'node:timers/promises';

const LOCK_SUFFIX = '.write-lock.sqlite';
const RETRY_DELAY_MS = 25;
const ACQUIRE_TIMEOUT_MS = 60_000;
const syncWaitState = new Int32Array(new SharedArrayBuffer(4));
const processLocks = new Set<string>();

type LockConnection = Database.Database;

function lockPath(databasePath: string): string {
  return `${databasePath}${LOCK_SUFFIX}`;
}

function isBusyError(error: unknown): boolean {
  return error instanceof Error
    && 'code' in error
    && (error.code === 'SQLITE_BUSY' || error.code === 'SQLITE_LOCKED');
}

function tryAcquire(databasePath: string): (() => void) | undefined {
  const writeLockPath = lockPath(databasePath);
  mkdirSync(path.dirname(writeLockPath), { recursive: true });
  const connection: LockConnection = new Database(writeLockPath);
  try {
    connection.pragma('busy_timeout = 0');
    connection.exec('BEGIN EXCLUSIVE');
    processLocks.add(writeLockPath);
  } catch (error) {
    connection.close();
    if (isBusyError(error)) return undefined;
    throw error;
  }

  return () => {
    try {
      connection.exec('COMMIT');
    } finally {
      connection.close();
      processLocks.delete(writeLockPath);
    }
  };
}

function timeoutError(databasePath: string): Error {
  return new Error(`Timed out waiting for another Graph Cache writer: ${databasePath}`);
}

function acquireSync(databasePath: string): () => void {
  const writeLockPath = lockPath(databasePath);
  if (processLocks.has(writeLockPath)) {
    throw new Error(`Graph Cache writing is already active in this process: ${databasePath}`);
  }
  const deadline = Date.now() + ACQUIRE_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const release = tryAcquire(databasePath);
    if (release) return release;
    Atomics.wait(syncWaitState, 0, 0, RETRY_DELAY_MS);
  }
  throw timeoutError(databasePath);
}

async function acquireAsync(databasePath: string): Promise<() => void> {
  const writeLockPath = lockPath(databasePath);
  const deadline = Date.now() + ACQUIRE_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (!processLocks.has(writeLockPath)) {
      const release = tryAcquire(databasePath);
      if (release) return release;
    }
    await wait(RETRY_DELAY_MS);
  }
  throw timeoutError(databasePath);
}

export function withWorkspaceCacheWriteLock<T>(
  databasePath: string,
  write: () => T,
): T {
  const release = acquireSync(databasePath);
  try {
    return write();
  } finally {
    release();
  }
}

export async function withWorkspaceCacheWriteLockAsync<T>(
  databasePath: string,
  write: () => Promise<T>,
): Promise<T> {
  const release = await acquireAsync(databasePath);
  try {
    return await write();
  } finally {
    release();
  }
}
