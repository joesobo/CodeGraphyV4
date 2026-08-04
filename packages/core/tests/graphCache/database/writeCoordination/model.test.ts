import { spawn } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import Database from 'libsql';
import { afterEach, describe, expect, it } from 'vitest';
import {
  markCodeGraphyWorkspaceChangesPending,
  readCodeGraphyWorkspaceMeta,
} from '../../../../src/workspace/meta';
import {
  getWorkspaceAnalysisDatabasePath,
  patchWorkspaceAnalysisDatabaseCacheAsync,
  saveWorkspaceAnalysisDatabaseCache,
} from '../../../../src/graphCache/database/storage';
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

async function startTimedHoldingWriter(
  databasePath: string,
  holdMilliseconds: number,
): Promise<{ completion: Promise<{ code: number | null; stderr: string }> }> {
  const moduleUrl = writeCoordinationModuleUrl();
  const program = [
    'const [moduleUrl, databasePath, holdMilliseconds] = process.argv.slice(1);',
    'const { withWorkspaceCacheWriteLockAsync } = await import(moduleUrl);',
    'await withWorkspaceCacheWriteLockAsync(databasePath, async () => {',
    "  process.stdout.write('locked\\n');",
    '  await new Promise(resolve => setTimeout(resolve, Number(holdMilliseconds)));',
    '});',
  ].join('\n');
  const child = spawn(process.execPath, [
    '--import', 'tsx', '--input-type=module', '--eval', program,
    moduleUrl, databasePath, String(holdMilliseconds),
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  let stderr = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', chunk => { stderr += chunk; });
  const completion = new Promise<{ code: number | null; stderr: string }>((resolve, reject) => {
    child.on('error', reject);
    child.on('close', code => resolve({ code, stderr }));
  });
  await new Promise<void>((resolve, reject) => {
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', chunk => {
      if (String(chunk).includes('locked')) resolve();
    });
    child.on('error', reject);
    child.on('close', code => reject(
      new Error(`Timed writer exited before locking (${code}): ${stderr}`),
    ));
  });
  return { completion };
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

async function startReleasableLockWriter(
  databasePath: string,
  environment?: NodeJS.ProcessEnv,
): Promise<{
  completion: Promise<{ code: number | null; stderr: string }>;
  lockPath: string;
  release(): void;
}> {
  const moduleUrl = writeCoordinationModuleUrl();
  const program = [
    'const [moduleUrl, databasePath] = process.argv.slice(1);',
    'const { getWorkspaceCacheWriteLockPath, withWorkspaceCacheWriteLockAsync } = await import(moduleUrl);',
    'await withWorkspaceCacheWriteLockAsync(databasePath, async () => {',
    "  process.stdout.write(`locked:${getWorkspaceCacheWriteLockPath(databasePath)}\\n`);",
    '  process.stdin.resume();',
    "  await new Promise(resolve => process.stdin.once('end', resolve));",
    '});',
  ].join('\n');
  const child = spawn(process.execPath, [
    '--import', 'tsx', '--input-type=module', '--eval', program,
    moduleUrl, databasePath,
  ], {
    env: environment ? { ...process.env, ...environment } : process.env,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
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
      new Error(`Releasable lock writer exited before acquiring ownership (${code}): ${stderr}`),
    ));
  });
  return {
    completion,
    lockPath: childLockPath,
    release: () => child.stdin.end(),
  };
}

async function startDurableWriteThenWait(databasePath: string, markerPath: string): Promise<{
  child: ReturnType<typeof spawn>;
  revision: string;
}> {
  const moduleUrl = writeCoordinationModuleUrl();
  const program = [
    "import { writeFileSync } from 'node:fs';",
    'const [moduleUrl, databasePath, markerPath] = process.argv.slice(1);',
    'const { withWorkspaceCacheWriteLockAsync } = await import(moduleUrl);',
    'await withWorkspaceCacheWriteLockAsync(databasePath, async revision => {',
    "  writeFileSync(markerPath, 'durable');",
    "  process.stdout.write(`written:${revision}\\n`);",
    '  await new Promise(() => setInterval(() => {}, 1_000));',
    '});',
  ].join('\n');
  const child = spawn(process.execPath, [
    '--import', 'tsx', '--input-type=module', '--eval', program,
    moduleUrl, databasePath, markerPath,
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  const revision = await new Promise<string>((resolve, reject) => {
    let stderr = '';
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', chunk => {
      const line = String(chunk).split('\n').find(value => value.startsWith('written:'));
      if (line) resolve(line.slice('written:'.length));
    });
    child.on('error', reject);
    child.on('close', code => reject(
      new Error(`Durable writer exited before its marker (${code}): ${stderr}`),
    ));
  });
  return { child, revision };
}

async function startPausedLockContender(databasePath: string): Promise<{
  child: ReturnType<typeof spawn>;
  completion: Promise<{ code: number | null; stderr: string }>;
  release(): void;
  resume(): void;
}> {
  const moduleUrl = writeCoordinationModuleUrl();
  const program = [
    'const [moduleUrl, databasePath] = process.argv.slice(1);',
    'const { withWorkspaceCacheWriteLockAsync } = await import(moduleUrl);',
    'await withWorkspaceCacheWriteLockAsync(databasePath, async () => {',
    "  process.stdout.write('paused\\n');",
    "  process.kill(process.pid, 'SIGSTOP');",
    '  process.stdin.resume();',
    "  await new Promise(resolve => process.stdin.once('end', resolve));",
    '});',
  ].join('\n');
  const child = spawn(process.execPath, [
    '--import', 'tsx', '--input-type=module', '--eval', program,
    moduleUrl, databasePath,
  ], { stdio: ['pipe', 'pipe', 'pipe'] });
  let stderr = '';
  let markPaused!: () => void;
  const pausedPromise = new Promise<void>(resolve => { markPaused = resolve; });
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', chunk => { stderr += chunk; });
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', chunk => {
    const output = String(chunk);
    if (output.includes('paused')) markPaused();
  });
  const completion = new Promise<{ code: number | null; stderr: string }>((resolve, reject) => {
    child.on('error', reject);
    child.on('close', code => resolve({ code, stderr }));
  });
  await pausedPromise;
  return {
    child,
    completion,
    release: () => child.stdin.end(),
    resume: () => process.kill(child.pid!, 'SIGCONT'),
  };
}

async function startExclusiveSqliteOwner(databasePath: string): Promise<{
  completion: Promise<{ code: number | null; stderr: string }>;
  release(): void;
}> {
  const program = [
    "import Database from 'libsql';",
    'const [databasePath] = process.argv.slice(1);',
    'const connection = new Database(databasePath);',
    "connection.exec('PRAGMA busy_timeout = 0; BEGIN EXCLUSIVE;');",
    "process.stdout.write('locked\\n');",
    'process.stdin.resume();',
    "await new Promise(resolve => process.stdin.once('end', resolve));",
    "connection.exec('ROLLBACK;');",
    'connection.close();',
  ].join('\n');
  const child = spawn(process.execPath, [
    '--import', 'tsx', '--input-type=module', '--eval', program, databasePath,
  ], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: join(import.meta.dirname, '../../../..'),
  });
  let stderr = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', chunk => { stderr += chunk; });
  const completion = new Promise<{ code: number | null; stderr: string }>((resolve, reject) => {
    child.on('error', reject);
    child.on('close', code => resolve({ code, stderr }));
  });
  await new Promise<void>((resolve, reject) => {
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', chunk => {
      if (String(chunk).includes('locked')) resolve();
    });
    child.on('error', reject);
    child.on('close', code => reject(
      new Error(`Exclusive SQLite owner exited before locking (${code}): ${stderr}`),
    ));
  });
  return { completion, release: () => child.stdin.end() };
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
      `${lockPath}.revision.sqlite`,
      `${lockPath}.revision.sqlite-journal`,
      `${lockPath}.revision.sqlite-shm`,
      `${lockPath}.revision.sqlite-wal`,
      `${lockPath}.recovery.sqlite`,
      `${lockPath}.recovery.sqlite-journal`,
      `${lockPath}.recovery.sqlite-shm`,
      `${lockPath}.recovery.sqlite-wal`,
      `${lockPath}.lock`,
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

  it('reserves every writer revision before its callback runs', async () => {
    const databasePath = createDatabasePath();

    const initialRevision = await readWorkspaceCacheWriteRevisionAsync(databasePath);
    await withWorkspaceCacheWriteLockAsync(databasePath, async revision => {
      expect(revision).toBe(initialRevision);
    });
    const successfulRevision = await readWorkspaceCacheWriteRevisionAsync(databasePath);
    expect(successfulRevision).not.toBe(initialRevision);
    await expect(withWorkspaceCacheWriteLockAsync(databasePath, async revision => {
      expect(revision).toBe(successfulRevision);
      throw new Error('write failed');
    })).rejects.toThrow('write failed');
    expect(await readWorkspaceCacheWriteRevisionAsync(databasePath))
      .not.toBe(successfulRevision);
  });

  it('recovers a corrupt ownership coordinator across real child contenders', async () => {
    const databasePath = createDatabasePath();
    const lockPath = getWorkspaceCacheWriteLockPath(databasePath);
    mkdirSync(dirname(lockPath), { recursive: true });
    writeFileSync(lockPath, 'not a sqlite database');
    const markerPath = `${databasePath}.writer`;

    await Promise.all(Array.from(
      { length: 8 },
      () => runContendingWriter(databasePath, markerPath),
    ));
    await expect(withWorkspaceCacheWriteLockAsync(
      databasePath,
      async () => undefined,
    )).resolves.toBeUndefined();

    expect(existsSync(markerPath)).toBe(false);
  }, 15_000);

  it('recovers a corrupt revision database and invalidates prepared work', async () => {
    const databasePath = createDatabasePath();
    const lockPath = getWorkspaceCacheWriteLockPath(databasePath);
    const preparedRevision = await readWorkspaceCacheWriteRevisionAsync(databasePath);
    writeFileSync(`${lockPath}.revision.sqlite`, 'not a sqlite database');
    const markerPath = `${databasePath}.writer`;

    await Promise.all(Array.from(
      { length: 8 },
      () => runContendingWriter(databasePath, markerPath),
    ));
    let recoveredRevision: unknown;
    await withWorkspaceCacheWriteLockAsync(databasePath, async revision => {
      recoveredRevision = revision;
    });

    expect(recoveredRevision).not.toBe(preparedRevision);
    expect(existsSync(markerPath)).toBe(false);
  }, 15_000);

  it('recreates revision state that does not contain opaque epochs', async () => {
    const databasePath = createDatabasePath();
    const revisionPath = `${getWorkspaceCacheWriteLockPath(databasePath)}.revision.sqlite`;
    const obsoleteRevision = new Database(revisionPath);
    obsoleteRevision.exec(`
      CREATE TABLE CacheWriteState (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        revision INTEGER NOT NULL
      ) STRICT;
      INSERT INTO CacheWriteState (id, revision) VALUES (1, 42);
    `);
    obsoleteRevision.close();

    const recoveredRevision = await readWorkspaceCacheWriteRevisionAsync(databasePath);
    await expect(withWorkspaceCacheWriteLockAsync(
      databasePath,
      async () => undefined,
    )).resolves.toBeUndefined();

    expect(recoveredRevision).toEqual(expect.any(String));
  });

  it('recovers when both disposable coordinator databases are corrupt', async () => {
    const databasePath = createDatabasePath();
    const lockPath = getWorkspaceCacheWriteLockPath(databasePath);
    mkdirSync(dirname(lockPath), { recursive: true });
    writeFileSync(lockPath, 'corrupt ownership');
    writeFileSync(`${lockPath}.revision.sqlite`, 'corrupt revision');
    const markerPath = `${databasePath}.writer`;

    await Promise.all(Array.from(
      { length: 8 },
      () => runContendingWriter(databasePath, markerPath),
    ));

    expect(existsSync(markerPath)).toBe(false);
  }, 15_000);

  it('keeps a pre-write revision reservation after a writer is killed', async () => {
    const databasePath = createDatabasePath();
    const markerPath = `${databasePath}.durable`;
    const preparedRevision = await readWorkspaceCacheWriteRevisionAsync(databasePath);
    const writer = await startDurableWriteThenWait(databasePath, markerPath);

    expect(writer.revision).toBe(preparedRevision);
    expect(existsSync(markerPath)).toBe(true);
    writer.child.kill('SIGKILL');
    await new Promise<void>(resolve => writer.child.once('close', () => resolve()));

    const observedRevision = await readWorkspaceCacheWriteRevisionAsync(databasePath);
    let staleAttemptCommitted = false;
    await withWorkspaceCacheWriteLockAsync(databasePath, async revision => {
      if (revision === preparedRevision) staleAttemptCommitted = true;
    });

    expect(observedRevision).not.toBe(preparedRevision);
    expect(staleAttemptCommitted).toBe(false);
  }, 15_000);

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

  it('keeps the event loop responsive while async ownership waits', async () => {
    const databasePath = createDatabasePath();
    const holder = await startTimedHoldingWriter(databasePath, 700);
    let timerFired = false;
    let timerFiredBeforeEntry = false;
    setTimeout(() => { timerFired = true; }, 50);

    await withWorkspaceCacheWriteLockAsync(databasePath, async () => {
      timerFiredBeforeEntry = timerFired;
    });

    expect(timerFiredBeforeEntry).toBe(true);
    expect(await holder.completion).toEqual({ code: 0, stderr: '' });
  });

  it('keeps Extension-facing async patches responsive during real contention', async () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), 'codegraphy-async-patch-'));
    temporaryDirectories.add(workspaceRoot);
    saveWorkspaceAnalysisDatabaseCache(
      workspaceRoot,
      { version: 'test', files: {} },
      { nodes: [], edges: [] },
    );
    const databasePath = getWorkspaceAnalysisDatabasePath(workspaceRoot);
    trackLockPath(databasePath);
    const holder = await startTimedHoldingWriter(databasePath, 700);
    let timerFired = false;
    setTimeout(() => { timerFired = true; }, 50);

    await patchWorkspaceAnalysisDatabaseCacheAsync(workspaceRoot, {
      deleteFilePaths: [],
      upsertFiles: {},
    });

    expect(timerFired).toBe(true);
    expect(await holder.completion).toEqual({ code: 0, stderr: '' });
  });

  it('fails synchronous ownership fast when another process owns the coordinator', async () => {
    const databasePath = createDatabasePath();
    const holder = await startTimedHoldingWriter(databasePath, 700);
    const startedAt = Date.now();

    expect(() => withWorkspaceCacheWriteLock(databasePath, () => undefined))
      .toThrow(/already active|another Graph Cache writer/i);
    const elapsedMilliseconds = Date.now() - startedAt;

    expect(elapsedMilliseconds).toBeLessThan(200);
    expect(await holder.completion).toEqual({ code: 0, stderr: '' });
  });

  it('proves BEGIN EXCLUSIVE excludes a second real process', async () => {
    const databasePath = createDatabasePath();
    const lockPath = getWorkspaceCacheWriteLockPath(databasePath);
    mkdirSync(dirname(lockPath), { recursive: true });
    const holder = await startExclusiveSqliteOwner(lockPath);
    const contender = new Database(lockPath);

    expect(() => contender.exec('PRAGMA busy_timeout = 0; BEGIN EXCLUSIVE;'))
      .toThrow(expect.objectContaining({ code: 'SQLITE_BUSY' }));

    contender.close();
    holder.release();
    expect(await holder.completion).toEqual({ code: 0, stderr: '' });
  });

  it('does not let a paused owner erase a successor owned by another process', async () => {
    const databasePath = createDatabasePath();
    const paused = await startPausedLockContender(databasePath);
    let successorEntered = false;
    const successorPromise = startReleasableLockWriter(databasePath).then(successor => {
      successorEntered = true;
      return successor;
    });
    let thirdEntered = false;
    const third = withWorkspaceCacheWriteLockAsync(databasePath, async () => {
      thirdEntered = true;
    });
    await new Promise(resolve => setTimeout(resolve, 100));
    const successorEnteredBeforeRelease = successorEntered;
    const thirdEnteredBeforeRelease = thirdEntered;

    paused.resume();
    paused.release();
    const pausedResult = await paused.completion;
    const successor = await successorPromise;
    successor.release();
    const successorResult = await successor.completion;
    await third;

    expect(successorEnteredBeforeRelease).toBe(false);
    expect(thirdEnteredBeforeRelease).toBe(false);
    expect(successorResult).toEqual({ code: 0, stderr: '' });
    expect(pausedResult).toEqual({ code: 0, stderr: '' });
    expect(thirdEntered).toBe(true);
  }, 10_000);

  it('serializes real-path and symlink-alias writers through one coordinator', async () => {
    const container = mkdtempSync(join(tmpdir(), 'codegraphy-symlink-lock-'));
    temporaryDirectories.add(container);
    const workspaceRoot = join(container, 'workspace');
    const aliasRoot = join(container, 'workspace-alias');
    mkdirSync(join(workspaceRoot, '.codegraphy'), { recursive: true });
    symlinkSync(workspaceRoot, aliasRoot, 'dir');
    const databasePath = join(workspaceRoot, '.codegraphy', 'graph.sqlite');
    const aliasDatabasePath = join(aliasRoot, '.codegraphy', 'graph.sqlite');
    trackLockPath(databasePath);
    trackLockPath(aliasDatabasePath);
    const holder = await startReleasableLockWriter(databasePath);
    let contenderEntered = false;
    const contender = withWorkspaceCacheWriteLockAsync(aliasDatabasePath, async () => {
      contenderEntered = true;
    });
    await new Promise(resolve => setTimeout(resolve, 100));
    const contenderEnteredBeforeRelease = contenderEntered;

    holder.release();
    const holderResult = await holder.completion;
    await contender;

    expect(holder.lockPath).toBe(getWorkspaceCacheWriteLockPath(aliasDatabasePath));
    expect(contenderEnteredBeforeRelease).toBe(false);
    expect(holderResult).toEqual({ code: 0, stderr: '' });
    expect(contenderEntered).toBe(true);
  }, 10_000);

  it('serializes writers when child HOME differs for the same effective user', async () => {
    const databasePath = createDatabasePath();
    const alternateHome = mkdtempSync(join(tmpdir(), 'codegraphy-alternate-home-'));
    temporaryDirectories.add(alternateHome);
    const holder = await startReleasableLockWriter(databasePath, { HOME: alternateHome });
    temporaryLockPaths.add(holder.lockPath);
    let contenderEntered = false;
    const contender = withWorkspaceCacheWriteLockAsync(databasePath, async () => {
      contenderEntered = true;
    });
    await new Promise(resolve => setTimeout(resolve, 100));
    const contenderEnteredBeforeRelease = contenderEntered;

    holder.release();
    const holderResult = await holder.completion;
    await contender;

    expect(holder.lockPath).toBe(getWorkspaceCacheWriteLockPath(databasePath));
    expect(contenderEnteredBeforeRelease).toBe(false);
    expect(holderResult).toEqual({ code: 0, stderr: '' });
    expect(contenderEntered).toBe(true);
  }, 10_000);

  it('serializes case aliases when the filesystem proves case-insensitive', async () => {
    const container = mkdtempSync(join(tmpdir(), 'codegraphy-case-lock-'));
    temporaryDirectories.add(container);
    const workspaceRoot = join(container, 'CaseWorkspace');
    const aliasRoot = join(container, 'caseworkspace');
    mkdirSync(join(workspaceRoot, '.codegraphy'), { recursive: true });
    if (!existsSync(aliasRoot)
      || realpathSync.native(aliasRoot) !== realpathSync.native(workspaceRoot)) return;
    const databasePath = join(workspaceRoot, '.codegraphy', 'graph.sqlite');
    const aliasDatabasePath = join(aliasRoot, '.codegraphy', 'graph.sqlite');
    trackLockPath(databasePath);
    trackLockPath(aliasDatabasePath);
    const holder = await startReleasableLockWriter(databasePath);
    let contenderEntered = false;
    const contender = withWorkspaceCacheWriteLockAsync(aliasDatabasePath, async () => {
      contenderEntered = true;
    });
    await new Promise(resolve => setTimeout(resolve, 100));
    const contenderEnteredBeforeRelease = contenderEntered;

    holder.release();
    const holderResult = await holder.completion;
    await contender;

    expect(holder.lockPath).toBe(getWorkspaceCacheWriteLockPath(aliasDatabasePath));
    expect(contenderEnteredBeforeRelease).toBe(false);
    expect(holderResult).toEqual({ code: 0, stderr: '' });
    expect(contenderEntered).toBe(true);
  }, 10_000);

  it('keeps distinct physical workspaces on distinct coordinators', () => {
    const firstDatabasePath = createDatabasePath();
    const secondDatabasePath = createDatabasePath();

    expect(getWorkspaceCacheWriteLockPath(firstDatabasePath))
      .not.toBe(getWorkspaceCacheWriteLockPath(secondDatabasePath));
  });

  it('rejects an old owner after its symlink workspace is retargeted', async () => {
    const container = mkdtempSync(join(tmpdir(), 'codegraphy-retarget-lock-'));
    temporaryDirectories.add(container);
    const oldWorkspaceRoot = join(container, 'old-workspace');
    const newWorkspaceRoot = join(container, 'new-workspace');
    const aliasRoot = join(container, 'workspace-alias');
    mkdirSync(join(oldWorkspaceRoot, '.codegraphy'), { recursive: true });
    mkdirSync(join(newWorkspaceRoot, '.codegraphy'), { recursive: true });
    symlinkSync(oldWorkspaceRoot, aliasRoot, 'dir');
    const aliasDatabasePath = join(aliasRoot, '.codegraphy', 'graph.sqlite');
    trackLockPath(aliasDatabasePath);

    await expect(withWorkspaceCacheWriteLockAsync(aliasDatabasePath, async () => {
      rmSync(aliasRoot);
      symlinkSync(newWorkspaceRoot, aliasRoot, 'dir');
      await markCodeGraphyWorkspaceChangesPending(aliasRoot, ['src/old.ts']);
    })).rejects.toMatchObject({ name: 'WorkspaceCacheWriteIdentityChangedError' });

    expect(readCodeGraphyWorkspaceMeta(newWorkspaceRoot).pendingChangedFiles).toEqual([]);
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
    let contenderRevision: string | undefined;
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
    expect(contenderRevision).toEqual(expect.any(String));
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
