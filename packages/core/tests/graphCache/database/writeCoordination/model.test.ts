import { spawn } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  statSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  markCodeGraphyWorkspaceChangesPending,
  readCodeGraphyWorkspaceMeta,
} from '../../../../src/workspace/meta';
import {
  hasWorkspaceCacheWriteOwnership,
  getWorkspaceCacheWriteLockPath,
  readWorkspaceCacheWriteRevisionAsync,
  withWorkspaceCacheWriteLock,
  withWorkspaceCacheWriteLockAsync,
  withWorkspaceCacheWriteLockIfParentExistsAsync,
} from '../../../../src/graphCache/database/writeCoordination/model';

const temporaryDirectories = new Set<string>();
const temporaryLockPaths = new Set<string>();

function trackLockPath(databasePath: string): void {
  temporaryLockPaths.add(getWorkspaceCacheWriteLockPath(databasePath));
}

function createDatabasePath(): string {
  const directory = mkdtempSync(join(tmpdir(), 'codegraphy-write-lock-'));
  temporaryDirectories.add(directory);
  const databasePath = join(directory, 'graph.sqlite');
  trackLockPath(databasePath);
  return databasePath;
}

function writeCoordinationModuleUrl(): string {
  return new URL(
    '../../../../src/graphCache/database/writeCoordination/model.ts',
    import.meta.url,
  ).href;
}

function workspaceMetaModuleUrl(): string {
  return new URL('../../../../src/workspace/meta.ts', import.meta.url).href;
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
    '  await new Promise(resolve => setInterval(() => {}, 1_000));',
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

async function startReleasableHoldingWriter(
  databasePath: string,
  workspaceRoot: string,
): Promise<{
  completion: Promise<{ code: number | null; stderr: string }>;
  lockPath: string;
  release(): void;
}> {
  const moduleUrl = writeCoordinationModuleUrl();
  const metaModuleUrl = workspaceMetaModuleUrl();
  const program = [
    'const [moduleUrl, metaModuleUrl, databasePath, workspaceRoot] = process.argv.slice(1);',
    'const { getWorkspaceCacheWriteLockPath, withWorkspaceCacheWriteOwnershipAsync } = await import(moduleUrl);',
    'const { markCodeGraphyWorkspaceChangesPending } = await import(metaModuleUrl);',
    'let identityChanged = false;',
    'try {',
    '  await withWorkspaceCacheWriteOwnershipAsync(databasePath, async context => {',
    "    process.stdout.write(`locked:${getWorkspaceCacheWriteLockPath(databasePath)}\\n`);",
    '    process.stdin.resume();',
    "    await new Promise(resolve => process.stdin.once('end', resolve));",
    "    await markCodeGraphyWorkspaceChangesPending(workspaceRoot, ['src/old.ts']);",
    '  });',
    '} catch (error) {',
    "  if (error?.name !== 'WorkspaceCacheWriteIdentityChangedError') throw error;",
    '  identityChanged = true;',
    '}',
    "if (!identityChanged) throw new Error('Old owner did not detect workspace replacement.');",
  ].join('\n');
  const child = spawn(process.execPath, [
    '--import', 'tsx', '--input-type=module', '--eval', program,
    moduleUrl, metaModuleUrl, databasePath, workspaceRoot,
  ], { stdio: ['pipe', 'pipe', 'pipe'] });
  let stderr = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', chunk => { stderr += chunk; });
  const completion = new Promise<{ code: number | null; stderr: string }>((resolve, reject) => {
    child.on('error', reject);
    child.on('close', code => resolve({ code, stderr }));
  });
  let childLockPath = '';
  await new Promise<void>((resolve, reject) => {
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', chunk => {
      const lockedLine = String(chunk).split('\n')
        .find(line => line.startsWith('locked:'));
      if (lockedLine) {
        childLockPath = lockedLine.slice('locked:'.length);
        resolve();
      }
    });
    child.on('error', reject);
    child.on('close', code => reject(
      new Error(`Releasable writer exited before acquiring ownership (${code}): ${stderr}`),
    ));
  });
  return {
    completion,
    lockPath: childLockPath,
    release: () => child.stdin.end(),
  };
}

afterEach(() => {
  for (const directory of temporaryDirectories) {
    rmSync(directory, { recursive: true, force: true });
  }
  temporaryDirectories.clear();
  for (const lockPath of temporaryLockPaths) {
    for (const artifactPath of [
      lockPath,
      `${lockPath}-journal`,
      `${lockPath}-shm`,
      `${lockPath}-wal`,
      `${lockPath}.owner`,
    ]) {
      rmSync(artifactPath, { recursive: true, force: true });
    }
  }
  temporaryLockPaths.clear();
});

describe('Graph Cache write coordination', () => {
  it('exposes ownership only while the async writer is active', async () => {
    const databasePath = createDatabasePath();
    let detachedOwnership: boolean | undefined;
    let finishDetachedCheck!: () => void;
    const detachedCheck = new Promise<void>(resolve => { finishDetachedCheck = resolve; });

    await withWorkspaceCacheWriteLockAsync(databasePath, async () => {
      expect(hasWorkspaceCacheWriteOwnership(databasePath)).toBe(true);
      setImmediate(() => {
        detachedOwnership = hasWorkspaceCacheWriteOwnership(databasePath);
        finishDetachedCheck();
      });
    });
    await detachedCheck;

    expect(detachedOwnership).toBe(false);
    expect(hasWorkspaceCacheWriteOwnership(databasePath)).toBe(false);
  });

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
    expect(statSync(getWorkspaceCacheWriteLockPath(databasePath)).isFile()).toBe(true);
    expect(existsSync(`${databasePath}.write-lock.sqlite`)).toBe(false);
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

  it('waits while another process owns the same coordinator', async () => {
    const databasePath = createDatabasePath();
    const holder = await startHoldingWriter(databasePath);
    let contenderEntered = false;
    const contender = withWorkspaceCacheWriteLockAsync(databasePath, async () => {
      contenderEntered = true;
    });
    await new Promise(resolve => setTimeout(resolve, 100));
    const contenderEnteredBeforeRelease = contenderEntered;

    holder.kill();
    await contender;

    expect(contenderEnteredBeforeRelease).toBe(false);
    expect(contenderEntered).toBe(true);
  });

  it('keeps one cross-process owner when the workspace root is replaced', async () => {
    const initialDatabasePath = createDatabasePath();
    const workspaceRoot = dirname(initialDatabasePath);
    const databasePath = join(workspaceRoot, '.codegraphy', 'graph.sqlite');
    trackLockPath(databasePath);
    mkdirSync(dirname(databasePath));
    const holder = await startReleasableHoldingWriter(
      databasePath,
      workspaceRoot,
    );

    rmSync(workspaceRoot, { recursive: true });
    mkdirSync(workspaceRoot);
    let contenderEntered = false;
    let contenderRevision: number | undefined;
    const contender = withWorkspaceCacheWriteLockIfParentExistsAsync(
      databasePath,
      async revision => {
        contenderEntered = true;
        contenderRevision = revision;
        await markCodeGraphyWorkspaceChangesPending(workspaceRoot, ['src/new.ts']);
      },
    );
    await new Promise(resolve => setTimeout(resolve, 100));
    const contenderEnteredBeforeRelease = contenderEntered;

    holder.release();
    const holderResult = await holder.completion;
    await contender;

    expect(holder.lockPath).toBe(getWorkspaceCacheWriteLockPath(databasePath));
    expect(contenderEnteredBeforeRelease).toBe(false);
    expect(holderResult).toEqual({ code: 0, stderr: '' });
    expect(readCodeGraphyWorkspaceMeta(workspaceRoot).pendingChangedFiles)
      .toEqual(['src/new.ts']);
    expect(contenderEntered).toBe(true);
    expect(contenderRevision).toBe(0);
  }, 10_000);

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
    expect(statSync(getWorkspaceCacheWriteLockPath(databasePath)).isFile()).toBe(true);
    expect(existsSync(`${databasePath}.write-lock.sqlite`)).toBe(false);
  }, 15_000);

  it('releases a synchronous writer after failure', () => {
    const databasePath = createDatabasePath();

    expect(() => withWorkspaceCacheWriteLock(databasePath, () => {
      throw new Error('write failed');
    })).toThrow('write failed');

    expect(() => withWorkspaceCacheWriteLock(databasePath, () => undefined)).not.toThrow();
  });
});
