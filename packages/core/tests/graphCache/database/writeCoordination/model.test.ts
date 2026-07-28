import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  withWorkspaceCacheWriteLock,
  withWorkspaceCacheWriteLockAsync,
} from '../../../../src/graphCache/database/writeCoordination/model';

const temporaryDirectories = new Set<string>();

function createDatabasePath(): string {
  const directory = mkdtempSync(join(tmpdir(), 'codegraphy-write-lock-'));
  temporaryDirectories.add(directory);
  return join(directory, 'graph.sqlite');
}

afterEach(() => {
  for (const directory of temporaryDirectories) {
    rmSync(directory, { recursive: true, force: true });
  }
  temporaryDirectories.clear();
});

describe('Graph Cache write coordination', () => {
  it('serializes asynchronous writers and releases the lock directory', async () => {
    const databasePath = createDatabasePath();
    const order: string[] = [];
    let markEntered!: () => void;
    let releaseFirst!: () => void;
    const entered = new Promise<void>(resolve => { markEntered = resolve; });
    const gate = new Promise<void>(resolve => { releaseFirst = resolve; });
    const first = withWorkspaceCacheWriteLockAsync(databasePath, async () => {
      order.push('first-start');
      markEntered();
      await gate;
      order.push('first-end');
    });
    await entered;
    const second = withWorkspaceCacheWriteLockAsync(databasePath, async () => {
      order.push('second');
    });
    await Promise.resolve();

    expect(order).toEqual(['first-start']);

    releaseFirst();
    await Promise.all([first, second]);

    expect(order).toEqual(['first-start', 'first-end', 'second']);
    expect(existsSync(`${databasePath}.write-lock`)).toBe(false);
  });

  it('recovers a lock abandoned by a terminated writer process', () => {
    const databasePath = createDatabasePath();
    const writeLockPath = `${databasePath}.write-lock`;
    mkdirSync(writeLockPath);
    writeFileSync(
      join(writeLockPath, 'owner.json'),
      JSON.stringify({ pid: 999_999_999, token: 'abandoned' }),
      'utf-8',
    );

    expect(() => withWorkspaceCacheWriteLock(databasePath, () => undefined)).not.toThrow();
    expect(existsSync(writeLockPath)).toBe(false);
  });

  it('recovers a stale lock left before its owner record was written', () => {
    const databasePath = createDatabasePath();
    const writeLockPath = `${databasePath}.write-lock`;
    mkdirSync(writeLockPath);
    const staleTime = new Date(Date.now() - 2_000);
    utimesSync(writeLockPath, staleTime, staleTime);

    expect(() => withWorkspaceCacheWriteLock(databasePath, () => undefined)).not.toThrow();
    expect(existsSync(writeLockPath)).toBe(false);
  });

  it('releases a synchronous writer after failure', () => {
    const databasePath = createDatabasePath();

    expect(() => withWorkspaceCacheWriteLock(databasePath, () => {
      throw new Error('write failed');
    })).toThrow('write failed');

    expect(() => withWorkspaceCacheWriteLock(databasePath, () => undefined)).not.toThrow();
  });
});
