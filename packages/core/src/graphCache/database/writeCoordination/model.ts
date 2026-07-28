import {
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { setTimeout as wait } from 'node:timers/promises';

const LOCK_SUFFIX = '.write-lock';
const OWNER_FILE = 'owner.json';
const RETRY_DELAY_MS = 25;
const ACQUIRE_TIMEOUT_MS = 60_000;
const OWNER_WRITE_GRACE_MS = 1_000;
const syncWaitState = new Int32Array(new SharedArrayBuffer(4));
const processLocks = new Set<string>();

interface LockOwner {
  pid: number;
  token: string;
}

function lockPath(databasePath: string): string {
  return `${databasePath}${LOCK_SUFFIX}`;
}

function ownerPath(writeLockPath: string): string {
  return path.join(writeLockPath, OWNER_FILE);
}

function isExistingPathError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'EEXIST';
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return !(error instanceof Error && 'code' in error && error.code === 'ESRCH');
  }
}

function readOwner(writeLockPath: string): LockOwner | undefined {
  try {
    const value = JSON.parse(readFileSync(ownerPath(writeLockPath), 'utf-8')) as Partial<LockOwner>;
    return Number.isInteger(value.pid) && typeof value.token === 'string'
      ? { pid: value.pid!, token: value.token }
      : undefined;
  } catch {
    return undefined;
  }
}

function removeAbandonedLock(writeLockPath: string): void {
  const owner = readOwner(writeLockPath);
  if (owner && isProcessAlive(owner.pid)) return;
  if (!owner) {
    try {
      if (Date.now() - statSync(writeLockPath).mtimeMs < OWNER_WRITE_GRACE_MS) return;
    } catch {
      return;
    }
  }
  rmSync(writeLockPath, { force: true, recursive: true });
}

function tryAcquire(databasePath: string): (() => void) | undefined {
  const writeLockPath = lockPath(databasePath);
  mkdirSync(path.dirname(writeLockPath), { recursive: true });
  const token = randomUUID();
  try {
    mkdirSync(writeLockPath);
  } catch (error) {
    if (!isExistingPathError(error)) throw error;
    removeAbandonedLock(writeLockPath);
    return undefined;
  }

  try {
    writeFileSync(ownerPath(writeLockPath), JSON.stringify({ pid: process.pid, token }), 'utf-8');
    processLocks.add(writeLockPath);
  } catch (error) {
    rmSync(writeLockPath, { force: true, recursive: true });
    throw error;
  }

  return () => {
    try {
      const owner = readOwner(writeLockPath);
      if (owner?.token === token) rmSync(writeLockPath, { force: true, recursive: true });
    } finally {
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
  const deadline = Date.now() + ACQUIRE_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (!processLocks.has(lockPath(databasePath))) {
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
