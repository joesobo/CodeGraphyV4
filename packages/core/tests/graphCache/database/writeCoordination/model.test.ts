import { spawn } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  rmSync,
  statSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'libsql';
import { afterEach, describe, expect, it } from 'vitest';
import {
  readWorkspaceCacheWriteRevisionAsync,
  withWorkspaceCacheWriteLock,
  withWorkspaceCacheWriteLockAsync,
} from '../../../../src/graphCache/database/writeCoordination/model';

const temporaryDirectories = new Set<string>();

function createDatabasePath(): string {
  const directory = mkdtempSync(join(tmpdir(), 'codegraphy-write-lock-'));
  temporaryDirectories.add(directory);
  return join(directory, 'graph.sqlite');
}

function writeCoordinationModuleUrl(): string {
  return new URL(
    '../../../../src/graphCache/database/writeCoordination/model.ts',
    import.meta.url,
  ).href;
}

async function runContendingWriter(databasePath: string, markerPath: string): Promise<void> {
  const moduleUrl = writeCoordinationModuleUrl();
  const program = [
    "import { writeFileSync, rmSync } from 'node:fs';",
    'const [moduleUrl, databasePath, markerPath] = process.argv.slice(1);',
    'const { withWorkspaceCacheWriteLockAsync } = await import(moduleUrl);',
    'await withWorkspaceCacheWriteLockAsync(databasePath, async () => {',
    "  writeFileSync(markerPath, String(process.pid), { flag: 'wx' });",
    '  await new Promise(resolve => setTimeout(resolve, 10));',
    '  rmSync(markerPath);',
    '});',
  ].join('\n');

  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, [
      '--import', 'tsx', '--input-type=module', '--eval', program,
      moduleUrl, databasePath, markerPath,
    ], { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', code => code === 0
      ? resolve()
      : reject(new Error(`Contending writer exited ${code}: ${stderr}`)));
  });
}

async function startHoldingWriter(databasePath: string): Promise<ReturnType<typeof spawn>> {
  const moduleUrl = writeCoordinationModuleUrl();
  const program = [
    'const [moduleUrl, databasePath] = process.argv.slice(1);',
    'const { withWorkspaceCacheWriteLockAsync } = await import(moduleUrl);',
    'await withWorkspaceCacheWriteLockAsync(databasePath, async () => {',
    "  process.stdout.write('locked\\n');",
    '  await new Promise(() => {});',
    '});',
  ].join('\n');
  const child = spawn(process.execPath, [
    '--import', 'tsx', '--input-type=module', '--eval', program,
    moduleUrl, databasePath,
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  await new Promise<void>((resolve, reject) => {
    let stderr = '';
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', chunk => {
      if (String(chunk).includes('locked')) resolve();
    });
    child.on('error', reject);
    child.on('close', code => reject(new Error(`Holding writer exited ${code}: ${stderr}`)));
  });
  return child;
}

afterEach(() => {
  for (const directory of temporaryDirectories) {
    rmSync(directory, { recursive: true, force: true });
  }
  temporaryDirectories.clear();
});

describe('Graph Cache write coordination', () => {
  it('serializes asynchronous writers through a persistent SQLite coordinator', async () => {
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
    expect(statSync(`${databasePath}.write-lock.sqlite`).isFile()).toBe(true);
  });

  it('advances the committed writer revision without advancing failed ownership', async () => {
    const databasePath = createDatabasePath();

    expect(await readWorkspaceCacheWriteRevisionAsync(databasePath)).toBe(0);
    await withWorkspaceCacheWriteLockAsync(databasePath, async () => undefined);
    expect(await readWorkspaceCacheWriteRevisionAsync(databasePath)).toBe(1);
    await expect(withWorkspaceCacheWriteLockAsync(databasePath, async () => {
      throw new Error('write failed');
    })).rejects.toThrow('write failed');
    expect(await readWorkspaceCacheWriteRevisionAsync(databasePath)).toBe(1);
  });

  it('waits for an external SQLite coordinator transaction', async () => {
    const databasePath = createDatabasePath();
    const coordinator = new Database(`${databasePath}.write-lock.sqlite`);
    coordinator.exec('BEGIN EXCLUSIVE');
    let entered = false;
    const contender = withWorkspaceCacheWriteLockAsync(databasePath, async () => {
      entered = true;
    });

    await new Promise(resolve => setTimeout(resolve, 50));
    expect(entered).toBe(false);
    coordinator.exec('COMMIT');
    coordinator.close();
    await contender;

    expect(entered).toBe(true);
  });

  it('serializes contenders after the active writer process terminates', async () => {
    const databasePath = createDatabasePath();
    const markerPath = `${databasePath}.writer`;
    const holder = await startHoldingWriter(databasePath);
    const contenders = Array.from(
      { length: 24 },
      () => runContendingWriter(databasePath, markerPath),
    );

    holder.kill();
    await Promise.all(contenders);

    expect(existsSync(markerPath)).toBe(false);
    expect(statSync(`${databasePath}.write-lock.sqlite`).isFile()).toBe(true);
  }, 15_000);

  it('releases a synchronous writer after failure', () => {
    const databasePath = createDatabasePath();

    expect(() => withWorkspaceCacheWriteLock(databasePath, () => {
      throw new Error('write failed');
    })).toThrow('write failed');

    expect(() => withWorkspaceCacheWriteLock(databasePath, () => undefined)).not.toThrow();
  });
});
